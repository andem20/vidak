import * as wasm from "vidak-wasm/vidak_wasm_bg.wasm";
import { Buffer } from "vidak-wasm/vidak_wasm";
import * as arrow from "apache-arrow";
import { VidakChartUtils, type Statistics } from "./vidak-utils";
import type { VidakChartRender } from "./charts/chartrender";
import { VidakLineChart } from "./charts/line";

// CONTAINER
interface VidakChartContainer {
  getCanvas(): HTMLCanvasElement;
  getContext2D(): CanvasRenderingContext2D;
  render(): void;
}

class VidakChartImpl implements VidakChartContainer {
  private canvas = document.createElement("canvas");
  private toolTip = document.createElement("div");
  private buffer: Buffer;
  private width: number;
  private height: number;
  private inset = [150, 50, 50, 150]; // left, top, right, bottom
  private chartTypes: {
    [key: string]: VidakChartRender;
  } = {
    line: new VidakLineChart(),
  };

  constructor(width: number, height: number) {
    console.time("CreateBuffer");
    this.buffer = Buffer.new(2);
    console.timeEnd("CreateBuffer");
    this.width = width;
    this.height = height;
    this.canvas.width = this.width + this.inset[0] + this.inset[2];
    this.canvas.height = this.height + this.inset[1] + this.inset[3];
    this.canvas.style.backgroundColor = "#ededed";
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getMaxX(): number {
    return this.width + this.inset[0] - this.inset[2];
  }

  getMinX(): number {
    return this.inset[0];
  }

  getMaxY(): number {
    return this.height + this.inset[1] - this.inset[3];
  }

  getMinY(): number {
    return this.inset[1];
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
    const arr = this.getArrow();
    let start = 0;
    let end = arr.batches[0].data.length;

    const arrSlice = arr.slice(start, end);
    const x = arrSlice.getChild("date")!;
    const y = arrSlice.getChild("col_1")!;
    const xField = arr.schema.fields[0];
    const yField = arr.schema.fields[1];

    const yStats = VidakChartUtils.getStatisticsFromMetadata(yField);

    this.updateCanvas(x, y, yStats);
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

    // FIXME this should consider min/max of y and keep track of percentage
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (end - start <= 2 && event.deltaY < 0) {
        return;
      }

      const posX = mouseX / (this.width - this.inset[0]);
      const delta = event.deltaY;
      end += delta * (1 - (end >= (maxLength ?? 0) || start === 0 ? 0 : posX));
      start -= delta * (end >= (maxLength ?? 0) || start === 0 ? 1 : posX);
      end = Math.max(Math.min(end, maxLength ?? 0), 2);
      start = Math.max(Math.min(start, end - 2), 0);
      // TODO handle horizontal scroll
      const arrSlice = arr.slice(start, end);
      const x = arrSlice.getChild("date")!;
      const y = arrSlice.getChild("col_1")!;
      this.updateCanvas(x, y, yStats);
    });
  }

  getBufferView(): Uint8Array {
    return new Uint8Array(wasm.memory.buffer).subarray(
      this.buffer.ptr(),
      this.buffer.ptr() + this.buffer.len(),
    );
  }

  getArrow(): arrow.Table {
    return arrow.tableFromIPC(this.getBufferView());
  }

  updateCanvas(x: arrow.Vector, y: arrow.Vector, yStats: Statistics) {
    const ctx = this.getContext2D();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = "500 0.8rem Arial";
    ctx.fillStyle = "#000000";

    // FIXME only for datetime
    this.drawGrid(yStats);

    this.chartTypes["line"].draw({
      ctx,
      x,
      y,
      yStats,
      dateOptions: {
        locale: "da-DK",
        timeZone: "UTC",
      },
      wordConfig: {
        height: 50,
      },
      canvasConfig: {
        width: this.width,
        height: this.height,
        inset: this.inset,
      },
    });
  }

  private drawGrid(stats: Statistics) {
    const amountLines = 6;
    const xLabelPadding = 20;

    const ctx = this.getContext2D();
    // draw horizontal lines and labels
    const maxXLabelSize = ctx.measureText(stats.max.toString());
    for (let i = 0; i <= amountLines; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1;
      const y = (this.height * i) / amountLines + this.getMinY();
      ctx.moveTo(this.getMinX(), y);
      ctx.lineTo(this.getMaxX(), y);
      ctx.stroke();
      // (point - min) / delta;
      ctx.fillText(
        Math.floor(
          stats.min + (stats.delta * (amountLines - i)) / amountLines,
        ).toString(),
        this.getMinX() - maxXLabelSize.width - xLabelPadding, // word width
        y + maxXLabelSize.emHeightDescent,
      );
    }
  }
}

export const createVidak = function () {
  return new VidakChartImpl(800, 400);
};
