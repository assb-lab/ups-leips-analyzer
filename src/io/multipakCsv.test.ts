import { describe, expect, test } from "vite-plus/test";
import { inferAppliedVoltage, inferSpectrumKind, parseMultiPakCsv } from "./multipakCsv";

const CSV = `2
no area description
IP
1,2
file#,2,4
16.40,880.0,580.0
16.39,1040.0,570.0
16.38,880.0,550.0
`;

describe("parseMultiPakCsv", () => {
  test("expands MultiPak CSV y columns into datasets", () => {
    const datasets = parseMultiPakCsv(CSV, { sourceName: "sample_UPS IP.csv" });
    expect(datasets).toHaveLength(2);
    expect(datasets[0]?.kind).toBe("ups-ip");
    expect(datasets[0]?.points[0]).toEqual({ x: 16.4, y: 880 });
    expect(datasets[1]?.name).toContain("#4");
    expect(datasets[0]?.metadata.appliedVoltage).toBe("0");
    expect(datasets[0]?.metadata.appliedVoltageSource).toBe("default");
  });

  test("infers applied voltage from series, metadata, filename and default", () => {
    expect(
      inferAppliedVoltage({
        seriesName: "IP-5V",
        metadataText: "",
        sourceName: "sample.csv",
      }),
    ).toEqual({ value: -5, source: "metadata" });
    expect(
      inferAppliedVoltage({
        seriesName: "",
        metadataText: "spectrum IP+3.5V",
        sourceName: "sample.csv",
      }),
    ).toEqual({ value: 3.5, source: "metadata" });
    expect(
      inferAppliedVoltage({
        seriesName: "",
        metadataText: "",
        sourceName: "sample_IP_5V.csv",
      }),
    ).toEqual({ value: 5, source: "filename" });
    expect(
      inferAppliedVoltage({
        seriesName: "",
        metadataText: "",
        sourceName: "sample.csv",
      }),
    ).toEqual({ value: 0, source: "default" });
  });

  test("infers spectrum kinds from filenames", () => {
    expect(inferSpectrumKind("UPS VB.csv")).toBe("ups-vb");
    expect(inferSpectrumKind("UPS IP.csv")).toBe("ups-ip");
    expect(inferSpectrumKind("LEET der 1st.spe.csv")).toBe("leet-der");
    expect(inferSpectrumKind("LEET 1st.spe.csv")).toBe("leet");
    expect(inferSpectrumKind("LEIPS LEET der 1st.spe.csv")).toBe("leet-der");
    expect(inferSpectrumKind("LEIPS LEET 1st.spe.csv")).toBe("leet");
    expect(inferSpectrumKind("LEIPS 2nd.spe.csv")).toBe("leips");
    expect(inferSpectrumKind("No.23_Li-rich_REELS.csv")).toBe("reels");
    expect(inferSpectrumKind("unknown.txt")).toBe("unknown");
  });

  test("uses metadata fallback for UPS and LEIPS family kinds", () => {
    expect(inferSpectrumKind({ sourceName: "scan.csv", metadataKind: "IP" })).toBe("ups-ip");
    expect(inferSpectrumKind({ sourceName: "scan.csv", metadataKind: "VB" })).toBe("ups-vb");
    expect(inferSpectrumKind({ sourceName: "LEIPS scan.csv", metadataKind: "LEET der" })).toBe(
      "leet-der",
    );
    expect(inferSpectrumKind({ sourceName: "LEIPS scan.csv", metadataKind: "LEET" })).toBe("leet");
    expect(inferSpectrumKind({ sourceName: "scan.csv", metadataKind: "LEIPS" })).toBe("leips");
  });

  test("supports forced kinds and 0,0 termination", () => {
    const csv = `unknown area
desc
raw
1,1
file#
1,2
0,0
2,5
`;
    const datasets = parseMultiPakCsv(csv, { sourceName: "raw.csv", forcedKind: "leips" });
    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.kind).toBe("leips");
    expect(datasets[0]?.points).toEqual([{ x: 1, y: 2 }]);
  });

  test("rejects invalid CSV shapes", () => {
    expect(() => parseMultiPakCsv("too\nshort", { sourceName: "bad.csv" })).toThrow(
      "at least five metadata rows",
    );
    expect(() =>
      parseMultiPakCsv(
        `a
b
c
d
file#
1
2
`,
        { sourceName: "bad.csv" },
      ),
    ).toThrow("one x column");
  });

  test("drops an incomplete row as a whole instead of shifting later points", () => {
    const [dataset] = parseMultiPakCsv(
      ["1", "d", "VB", "1,1", "file#,2", "3,30", "2,", "1,10"].join("\n"),
      { sourceName: "ups_vb.csv" },
    );

    expect(dataset?.points).toEqual([
      { x: 3, y: 30 },
      { x: 1, y: 10 },
    ]);
  });

  test("keeps columns aligned per row when only one y column has a gap", () => {
    const datasets = parseMultiPakCsv(
      ["1", "d", "UPS IP", "1,1", "file#,22,24", "3,30,300", "2,,200", "1,10,100"].join("\n"),
      { sourceName: "ups_ip.csv" },
    );

    expect(datasets.map((dataset) => dataset.points)).toEqual([
      [
        { x: 3, y: 30 },
        { x: 1, y: 10 },
      ],
      [
        { x: 3, y: 300 },
        { x: 2, y: 200 },
        { x: 1, y: 100 },
      ],
    ]);
  });

  test("keeps the original column identity when an earlier y column is empty", () => {
    const datasets = parseMultiPakCsv(
      ["1", "d", "UPS IP", "1,1", "file#,IP-5V,IP+5V", "3,,300", "2,,200", "1,,100"].join("\n"),
      { sourceName: "ups_ip.csv" },
    );

    expect(datasets).toHaveLength(1);
    expect(datasets[0]?.id).toBe("ups-ip-2");
    expect(datasets[0]?.metadata.columnIndex).toBe("2");
    expect(datasets[0]?.metadata.appliedVoltage).toBe("5");
    expect(datasets[0]?.name).toBe("ups_ip");
    expect(datasets[0]?.points).toHaveLength(3);
  });

  test("records the original column index for every dataset", () => {
    const datasets = parseMultiPakCsv(CSV, { sourceName: "ip.csv" });
    expect(datasets.map((dataset) => dataset.metadata.columnIndex)).toEqual(["1", "2"]);
  });

  test("reads a numeric block too long to spread into function arguments", () => {
    const rowCount = 500_000;
    const numericRows = Array.from({ length: rowCount }, (_, index) => `${index + 1},${index}`);
    const [dataset] = parseMultiPakCsv(
      ["1", "d", "VB", "1,1", "file#,2", ...numericRows].join("\n"),
      {
        sourceName: "ups_vb.csv",
      },
    );

    expect(dataset?.points).toHaveLength(rowCount);
  });
});
