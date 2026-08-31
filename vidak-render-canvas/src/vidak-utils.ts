import * as arrow from "apache-arrow";

export interface Statistics {
  min: number;
  max: number;
  delta: number;
}

export class VidakChartUtils {
  static getStatistics(slice: arrow.Vector): Statistics {
    const min = slice?.get(0);
    const max = slice?.get(slice.length - 1);
    const delta = max - min;
    return { min, max, delta };
  }

  static getStatisticsFromMetadata(field: arrow.Field): Statistics {
    const min = parseFloat(field.metadata.get("min") ?? "0");
    const max = parseFloat(field.metadata.get("max") ?? "0");
    const delta = max - min;
    return { min, max, delta };
  }

  static calcPos(point: number, min: number, delta: number) {
    return (point - min) / delta;
  }
}
