import * as wasm from "vidak-wasm/vidak_wasm_bg.wasm";
import { Buffer } from "vidak-wasm/vidak_wasm";
import * as arrow from "apache-arrow";

interface Statistics {
  min: number;
  max: number;
  delta: number;
}

interface VidakChartRenderProps {
  ctx: CanvasRenderingContext2D;
  x: arrow.Vector;
  y: arrow.Vector;
  yStats: Statistics;
  wordConfig: {
    height: number;
  };
  canvasConfig: {
    width: number;
    height: number;
    inset: number[];
  };
  dateOptions?: {
    locale: string;
    timeZone: string;
  };
}

interface VidakChartRender {
  draw(props: VidakChartRenderProps): void;
}

class VidakChartUtils {
  static getStatistics(slice: arrow.Vector): Statistics {
    const min = slice?.get(0);
    const max = slice?.get(slice.length - 1);
    const delta = max - min;
    return { min, max, delta };
  }
}

class VidakLineChart implements VidakChartRender {
  draw(props: VidakChartRenderProps): void {
    const ctx = props.ctx;
    const xSlice = props.x;
    const ySlice = props.y;
    const xStats = VidakChartUtils.getStatistics(xSlice);
    const yStats = props.yStats;
    const canvasConfig = props.canvasConfig;

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;

    const yLabelPadding = 50;

    const xLabelWidth = Math.round(
      ctx.measureText(
        new Date(xSlice.get(0)).toLocaleString(props.dateOptions?.locale, {
          timeZone: props.dateOptions?.timeZone,
        }),
      ).width,
    );

    const xLabelOffset = xLabelWidth / 3;

    const size = xSlice.data[0].length;

    const xLabelAmount = Math.floor(
      canvasConfig.width / (xLabelWidth + xLabelOffset),
    );

    const xLabelIncrement = xStats.delta / xLabelAmount;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    for (let i = 0; i < xLabelAmount; i++) {
      const date = xLabelIncrement * i + xStats.min;
      let x =
        this.calcPos(date, xStats.min, xStats.delta) *
        (canvasConfig.width - canvasConfig.inset[0]);
      ctx.fillText(
        new Date(date).toLocaleString(props.dateOptions?.locale, {
          timeZone: props.dateOptions?.timeZone,
        }),
        x + canvasConfig.inset[0] - xLabelWidth / 2,
        canvasConfig.height + canvasConfig.inset[1] + yLabelPadding,
      );
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    // draw line
    // TODO only draw point if non-overlapping
    for (let i = 0; i < size; i++) {
      const date = xSlice.get(i);
      let x =
        this.calcPos(date, xStats.min, xStats.delta) *
        (canvasConfig.width - canvasConfig.inset[0]);
      const deaths = ySlice.get(i);
      let y =
        -this.calcPos(deaths, yStats.min, yStats.delta) * canvasConfig.height;
      x += canvasConfig.inset[0];
      y += canvasConfig.height + canvasConfig.inset[1];
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // draw points
    for (let i = 0; i < size; i++) {
      // FIXME
      ctx.beginPath();
      const date = xSlice.get(i);
      let x =
        this.calcPos(date, xStats.min, xStats.delta) *
        (canvasConfig.width - canvasConfig.inset[0]);
      const deaths = ySlice.get(i);
      let y =
        -this.calcPos(deaths, yStats.min, yStats.delta) * canvasConfig.height;
      x += canvasConfig.inset[0];
      y += canvasConfig.height + canvasConfig.inset[1];
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#ff0000";
      ctx.fill();
    }
  }

  private calcPos(point: number, min: number, delta: number) {
    return (point - min) / delta;
  }
}

// CONTAINER
interface VidakChartContainer {
  getCanvas(): HTMLCanvasElement;
  getContext2D(): CanvasRenderingContext2D;
  render(): void;
}

class VidakChartImpl implements VidakChartContainer {
  private canvas = document.createElement("canvas");
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
    const arr = this.getArrow();
    let start = 0;
    let end = arr.batches[0].data.length;

    const arrSlice = arr.slice(start, end);
    const x = arrSlice.getChild("date")!;
    const y = arrSlice.getChild("deaths")!;

    const yStats = VidakChartUtils.getStatistics(y);

    this.testRender(x, y, yStats);
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
      const delta = event.deltaY / 25;
      end += delta * (1 - (end >= (maxLength ?? 0) || start === 0 ? 0 : posX));
      start -= delta * (end >= (maxLength ?? 0) || start === 0 ? 1 : posX);
      end = Math.max(Math.min(end, maxLength ?? 0), 2);
      start = Math.max(Math.min(start, end - 2), 0);
      // FIXME should be relative to the mouse cursor
      // TODO handle horizontal scroll
      const arrSlice = arr.slice(start, end);
      const x = arrSlice.getChild("date")!;
      const y = arrSlice.getChild("deaths")!;
      this.testRender(x, y, yStats);
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

  /**
   * Only for testing
   * @deprecated
   */
  testRender(x: arrow.Vector, y: arrow.Vector, yStats: Statistics) {
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
    const axisOffset = 0;
    const amountLines = 6;
    const xLabelPadding = 20;

    const ctx = this.getContext2D();
    // draw horizontal lines and labels
    const maxXLabelSize = ctx.measureText(stats.max.toString());
    for (let i = 0; i <= amountLines; i++) {
      ctx.beginPath();
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 1;
      const y = (this.height * i) / amountLines + this.inset[1];
      ctx.moveTo(this.inset[0] - axisOffset, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      // (point - min) / delta;
      ctx.fillText(
        Math.floor(
          stats.min + (stats.delta * (amountLines - i)) / amountLines,
        ).toString(),
        this.inset[0] - maxXLabelSize.width - xLabelPadding, // word width
        y + maxXLabelSize.emHeightDescent,
      );
    }
  }
}

export const createVidak = function () {
  return new VidakChartImpl(800, 400);
};
