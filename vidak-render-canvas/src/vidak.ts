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
    this.testRender();
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
  testRender() {
    const ctx = this.getContext2D();

    const arr = this.getArrow();

    const [minX, _maxX, deltaX] = this.getMinMax(arr.schema, "date").map(
      (x) => x * 86400000,
    );
    const [minY, maxY, deltaY] = this.getMinMax(arr.schema, "deaths");

    const axisOffset = 20;

    const amountLines = 6;

    for (let i = 0; i <= amountLines; i++) {
      console.log(i);
      ctx.beginPath();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      const y = (this.height * i) / amountLines + this.inset[1];
      ctx.moveTo(this.inset[0] - axisOffset, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      ctx.strokeText(
        ((maxY * (amountLines - i)) / amountLines).toString(),
        50,
        y,
      );
    }

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    for (let i = 0; i < arr.numRows; i++) {
      const date = arr.getChild("date")?.get(i);
      let x = this.calcPos(date, minX, deltaX) * (this.width - this.inset[0]);
      const deaths = arr.getChild("deaths")?.get(i);
      let y = -this.calcPos(deaths, minY, deltaY) * this.height;
      x += this.inset[0];
      y += this.height + this.inset[1];
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let i = 0; i < arr.numRows; i += 2) {
      // FIXME
      ctx.beginPath();
      const date = arr.getChild("date")?.get(i);
      let x = this.calcPos(date, minX, deltaX) * (this.width - this.inset[0]);
      const deaths = arr.getChild("deaths")?.get(i);
      let y = -this.calcPos(deaths, minY, deltaY) * this.height;
      x += this.inset[0];
      y += this.height + this.inset[1];
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  }

  private calcPos(point: number, min: number, delta: number) {
    return (point - min) / delta;
  }

  private getMinMax(schema: arrow.Schema, key: string) {
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
