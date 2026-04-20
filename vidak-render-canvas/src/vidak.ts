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

  constructor() {
    // fix unreachable
    // wasm.buffer_free(0);
    this.buffer = Buffer.new(1000);
    this.canvas.width = 500;
    this.canvas.height = 500;
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
    const yOffset = this.canvas.height / 2;

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    const arr = this.getArrow();
    for (let i = 0; i < arr.numRows; i++) {
      const y = arr.getChild("y")?.get(i);
      const x = arr.getChild("x")?.get(i);
      ctx.lineTo(x, y + yOffset);
    }
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export const createVidak = function () {
  return new VidakChartImpl();
};

/**
 * Data layout
 * type; [len; data;]
 *
 * types: int, float, string, timestamp
 */
