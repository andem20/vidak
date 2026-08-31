import { VidakChartUtils } from "../vidak-utils";
import type { VidakChartRender, VidakChartRenderProps } from "./chartrender";

export class VidakLineChart implements VidakChartRender {
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

    // FIXME only handles dates
    for (let i = 0; i <= xLabelAmount; i++) {
      const date = xLabelIncrement * i + xStats.min;
      let x =
        VidakChartUtils.calcPos(date, xStats.min, xStats.delta) *
        (canvasConfig.width - canvasConfig.inset[2]);
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
    for (let i = 0; i < size; i++) {
      const date = xSlice.get(i);
      let x =
        VidakChartUtils.calcPos(date, xStats.min, xStats.delta) *
        (canvasConfig.width - canvasConfig.inset[2]);
      const deaths = ySlice.get(i);
      let y =
        -VidakChartUtils.calcPos(deaths, yStats.min, yStats.delta) *
        canvasConfig.height;
      x += canvasConfig.inset[0];
      y += canvasConfig.height + canvasConfig.inset[1];
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // draw points
    // TODO should be configurable?
    if (size / canvasConfig.width < 0.2) {
      for (let i = 0; i < size; i++) {
        // FIXME
        const date = xSlice.get(i);
        let x =
          VidakChartUtils.calcPos(date, xStats.min, xStats.delta) *
          (canvasConfig.width - canvasConfig.inset[2]);

        ctx.beginPath();
        const deaths = ySlice.get(i);
        let y =
          -VidakChartUtils.calcPos(deaths, yStats.min, yStats.delta) *
          canvasConfig.height;
        x += canvasConfig.inset[0];
        y += canvasConfig.height + canvasConfig.inset[1];
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#ff0000";
        ctx.fill();
      }
    }
  }
}
