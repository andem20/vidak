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

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    const arr = this.getArrow();

    const [minX, _maxX, deltaX] = this.getMinMax(arr.schema, "date").map(
      (x) => x * 86400000,
    );
    const [minY, _maxY, deltaY] = this.getMinMax(arr.schema, "deaths");

    ctx.lineWidth = 3;

    for (let i = 0; i < arr.numRows; i++) {
      const date = arr.getChild("date")?.get(i);
      const x = this.calcPos(date, minX, deltaX) * this.width;
      const deaths = arr.getChild("deaths")?.get(i);
      const y = -this.calcPos(deaths, minY, deltaY) * this.height;
      console.log(x, y);
      ctx.lineTo(x + this.inset[0], y + this.height + this.inset[1]);
    }
    ctx.stroke();
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
