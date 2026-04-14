interface VidakChart {
  getCanvas(): HTMLCanvasElement;
  getContext2D(): CanvasRenderingContext2D;
  render(): void;
}

class VidakChartImpl implements VidakChart {
  private canvas = document.createElement("canvas");
  private buffer: Uint8Array;

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

  /**
   * Only for testing
   * @deprecated
   */
  testRender() {
    const ctx = this.getContext2D();
    const yOffset = 50;

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    for (let x = 0; x < 100; x++) {
      ctx.lineTo(x, Math.sin(x) * 10 + yOffset);
    }
    ctx.stroke();
  }
}

export const createVidak = function () {
  return new VidakChartImpl();
};

/**
 * Data layout
 * type; len; data;
 *
 * types: int, float, string, timestamp
 */
