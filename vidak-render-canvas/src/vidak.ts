import * as wasm from "vidak-wasm/vidak_wasm_bg.wasm";
import { Buffer } from "vidak-wasm/vidak_wasm";
import * as arrow from "apache-arrow";

interface VidakChart {
  getCanvas(): HTMLCanvasElement;
  getContext2D(): CanvasRenderingContext2D;
  render(): void;
}

class VidakChartImpl implements VidakChart {
  private canvas = document.createElement("canvas");
  private buffer: Buffer;
  private width: number;
  private height: number;
  private inset = [150, 50, 50, 150]; // left, top, right, bottom

  constructor(width: number, height: number) {
    this.buffer = Buffer.new(1000000);
    this.width = width;
    this.height = height;
    this.canvas.width = this.width + this.inset[0] + this.inset[2];
    this.canvas.height = this.height + this.inset[1] + this.inset[3];
    this.canvas.style.backgroundColor = "#ededed";
  }

  getContext2D(): CanvasRenderingContext2D {
    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed getting 2d context");
    }

    return context;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  render(): void {
    // draw the buffer onto the canvas
    let end = 200;
    let start = 0;
    const arr = this.getArrow();
    this.testRender(0, end, arr);
    const maxLength = arr.getChildAt(0)?.length;

    let mouseX = 0;
    let mouseY = 0;
    this.canvas.addEventListener("mousemove", (event) => {
      mouseX = Math.max(
        Math.min(this.width - this.inset[0], event.offsetX - this.inset[0]),
        0,
      );
      mouseY = Math.max(
        Math.min(this.height, event.offsetY - this.inset[1]),
        0,
      );
    });

    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const posX = mouseX / (this.width - this.inset[0]);
      const delta = event.deltaY / 50;
      end += delta * (1 - posX);
      start -= delta * posX;
      end = Math.floor(Math.max(Math.min(end, maxLength ?? 0), 2));
      start = Math.floor(Math.max(Math.min(start, end - 2), 0));
      console.log(start, end);
      // FIXME should be relative to the mouse cursor
      this.testRender(start, end, arr);
    });
  }

  getBufferView(): Uint8Array {
    return new Uint8Array(wasm.memory.buffer).subarray(
      this.buffer.ptr(),
      this.buffer.ptr() + this.buffer!.len(),
    );
  }

  getArrow() {
    return arrow.tableFromIPC(this.getBufferView());
  }

  /**
   * Only for testing
   * @deprecated
   */
  testRender(start: number, end: number, arr: arrow.Table) {
    const ctx = this.getContext2D();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const size = arr.batches[0].numRows;
    arr = arr.slice(start, end);

    // Datetime settings
    const dateOptions = {
      timeZone: "UTC",
    };
    const locale = "da-DK";

    // FIXME only for datetime
    const [minX, _maxX, deltaX] = this.getMinMaxDelta(arr, "date");
    const [minY, maxY, deltaY] = this.getMinMaxDelta(arr, "deaths");

    const axisOffset = 0;
    const amountLines = 6;

    ctx.font = "500 0.8rem Arial";
    ctx.fillStyle = "#000000";

    // draw horizontal lines and labels
    for (let i = 0; i <= amountLines; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1;
      const y = (this.height * i) / amountLines + this.inset[1];
      ctx.moveTo(this.inset[0] - axisOffset, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      ctx.fillText(
        Math.floor((maxY * (amountLines - i)) / amountLines).toString(),
        50, // word width
        y,
      );
    }

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    const wordHeight = 50;

    const xLabelWidth = Math.round(
      ctx.measureText(
        new Date(arr.getChild("date")?.get(0)).toLocaleString(
          locale,
          dateOptions,
        ),
      ).width,
    );

    const xLabelOffset = xLabelWidth / 3;

    let lastXLabel = -1;

    // draw line
    // TODO only draw point if non-overlapping
    for (let i = 0; i < size; i++) {
      const date = arr.getChild("date")?.get(i);
      let x = this.calcPos(date, minX, deltaX) * (this.width - this.inset[0]);
      const deaths = arr.getChild("deaths")?.get(i);
      let y = -this.calcPos(deaths, minY, deltaY) * this.height;
      x += this.inset[0];
      y += this.height + this.inset[1];
      ctx.lineTo(x, y);

      // draw label
      let currentXLabel = Math.floor(
        (x - this.inset[0]) / (xLabelWidth + xLabelOffset),
      );

      if (currentXLabel > lastXLabel) {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.fillText(
          new Date(date).toLocaleString(locale, dateOptions),
          x - xLabelWidth / 2,
          this.height + this.inset[1] + wordHeight,
        );
        lastXLabel = currentXLabel;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
      }
    }
    ctx.stroke();

    // draw points
    for (let i = 0; i < size; i++) {
      // FIXME
      ctx.beginPath();
      const date = arr.getChild("date")?.get(i);
      let x = this.calcPos(date, minX, deltaX) * (this.width - this.inset[0]);
      const deaths = arr.getChild("deaths")?.get(i);
      let y = -this.calcPos(deaths, minY, deltaY) * this.height;
      x += this.inset[0];
      y += this.height + this.inset[1];
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ff0000";
      ctx.fill();
    }
  }

  private calcPos(point: number, min: number, delta: number) {
    return (point - min) / delta;
  }

  private getMinMaxDelta(arr: arrow.Table, key: string) {
    const slice = arr.getChild(key);
    const min = slice?.get(0);
    const max = slice?.get(slice.length - 1);
    const delta = max - min;
    return [min, max, delta];
  }

  private getMinMax(schema: arrow.Schema, key: string) {
    // FIXME should just grab the first and last element. Assume it's sorted
    const min = parseInt(
      schema.fields.find((f) => f.name === key)?.metadata.get("min") ?? "",
    );

    const max = parseInt(
      schema.fields.find((f) => f.name === key)?.metadata.get("max") ?? "",
    );

    const delta = max - min;

    return [min, max, delta];
  }
}

export const createVidak = function () {
  return new VidakChartImpl(1000, 500);
};

/**
 * Data layout
 * type; [len; data;]
 *
 * types: int, float, string, timestamp
 */
