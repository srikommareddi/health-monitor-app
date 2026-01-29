import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  strokeColor?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function GlucoseSparkline({
  data,
  width = 120,
  height = 28,
  strokeWidth = 2,
  strokeColor = "#2F80ED",
}: Props) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);

    const range = max - min || 1; // avoid divide-by-zero
    const stepX = width / (data.length - 1);

    const pts = data.map((v, i) => {
      const x = i * stepX;
      // invert Y because SVG y grows downward
      const y = height - (clamp(v, min, max) - min) * (height / range);
      return { x, y };
    });

    // Smooth-ish path using quadratic bezier segments
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const cpx = ((prev.x + cur.x) / 2).toFixed(2);
      const cpy = prev.y.toFixed(2);
      const x = cur.x.toFixed(2);
      const y = cur.y.toFixed(2);
      d += ` Q ${cpx} ${cpy} ${x} ${y}`;
    }
    return d;
  }, [data, width, height]);

  if (!path) return <View style={{ width, height }} />;

  return (
    <Svg width={width} height={height}>
      <Path d={path} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
    </Svg>
  );
}
