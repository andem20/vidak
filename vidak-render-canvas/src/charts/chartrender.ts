import * as arrow from "apache-arrow";
import type { Statistics } from "../vidak-utils";

export interface VidakChartRenderProps {
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

export interface VidakChartRender {
  draw(props: VidakChartRenderProps): void;
}
