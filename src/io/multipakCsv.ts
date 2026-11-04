import type { Point, SpectrumDataset, SpectrumKind } from "../domain/types";

export interface ParseMultiPakOptions {
  sourceName: string;
  forcedKind?: SpectrumKind;
}

export function parseMultiPakCsv(text: string, options: ParseMultiPakOptions): SpectrumDataset[] {
  const rows = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length < 6) {
    throw new Error("MultiPak CSV requires at least five metadata rows and one numeric row.");
  }

  const metadataRows = rows.slice(0, 5);
  const kindText = metadataRows[2] ?? "";
  const header = splitCsvLine(metadataRows[4] ?? "");
  const numericRows = rows
    .slice(5)
    .map(splitCsvLine)
    .filter((row) => row.length >= 2);
  const table = parseNumericRows(numericRows);
  if (table.width < 2) {
    throw new Error("MultiPak CSV must contain one x column and at least one y column.");
  }
  const yColumns = pointsByYColumn(table);

  const datasets: SpectrumDataset[] = [];
  for (const { columnIndex: yIndex, points } of yColumns) {
    const seriesLabel = header[yIndex] && header[yIndex] !== "" ? header[yIndex] : `${yIndex}`;
    const kind =
      options.forcedKind ??
      inferSpectrumKind({
        sourceName: options.sourceName,
        metadataKind: kindText,
        headerText: metadataRows.join(" "),
      });
    const voltage = inferAppliedVoltage({
      seriesName: seriesLabel,
      metadataText: metadataRows.join(" "),
      sourceName: options.sourceName,
    });
    datasets.push({
      id: createDatasetId(options.sourceName, yIndex),
      name:
        yColumns.length > 1
          ? `${stripExtension(options.sourceName)} #${seriesLabel}`
          : stripExtension(options.sourceName),
      sourceName: options.sourceName,
      kind,
      xLabel: axisLabelForKind(kind),
      yLabel: "Intensity / a.u.",
      points,
      metadata: {
        area: metadataRows[0] ?? "",
        description: metadataRows[1] ?? "",
        kind: kindText,
        series: metadataRows[3] ?? "",
        columns: metadataRows[4] ?? "",
        columnIndex: String(yIndex),
        appliedVoltage: String(voltage.value),
        appliedVoltageSource: voltage.source,
      },
    });
  }

  if (datasets.length === 0) {
    throw new Error("MultiPak CSV did not contain any numeric datasets.");
  }
  return datasets;
}

export function inferSpectrumKind(
  input: string | { sourceName: string; metadataKind?: string; headerText?: string },
): SpectrumKind {
  if (typeof input === "string") {
    return inferSpectrumKindFromContext({
      sourceName: input,
      metadataKind: input,
      headerText: input,
    });
  }
  return inferSpectrumKindFromContext(input);
}

export function inferAppliedVoltage(input: {
  seriesName?: string;
  metadataText?: string;
  sourceName: string;
}): { value: number; source: "metadata" | "filename" | "default" } {
  const seriesMatch = voltageNearIp(input.seriesName ?? "");
  if (seriesMatch !== undefined) {
    return { value: seriesMatch, source: "metadata" };
  }
  const metadataMatch = voltageNearIp(input.metadataText ?? "");
  if (metadataMatch !== undefined) {
    return { value: metadataMatch, source: "metadata" };
  }
  const filenameMatch = voltageNearIp(input.sourceName);
  if (filenameMatch !== undefined) {
    return { value: filenameMatch, source: "filename" };
  }
  return { value: 0, source: "default" };
}

function voltageNearIp(text: string): number | undefined {
  const normalized = text.replace(/_/g, " ");
  const match = /\bip\s*([+-]?\d+(?:\.\d+)?)\s*v\b/iu.exec(normalized);
  if (!match?.[1]) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function inferSpectrumKindFromContext(input: {
  sourceName: string;
  metadataKind?: string;
  headerText?: string;
}): SpectrumKind {
  const filename = normalizeKindText(input.sourceName);
  const metadata = normalizeKindText(`${input.metadataKind ?? ""} ${input.headerText ?? ""}`);
  const combined = `${filename} ${metadata}`;
  if (hasTerm(combined, "reels")) {
    return "reels";
  }
  if (hasTerm(metadata, "ip")) {
    return "ups-ip";
  }
  if (hasTerm(metadata, "vb")) {
    return "ups-vb";
  }
  if (hasTerm(filename, "ups") && hasTerm(filename, "ip")) {
    return "ups-ip";
  }
  if (hasTerm(filename, "ups") && hasTerm(filename, "vb")) {
    return "ups-vb";
  }
  if (hasTerm(filename, "leips")) {
    if (hasTerm(filename, "leet") && hasTerm(filename, "der")) {
      return "leet-der";
    }
    if (hasTerm(filename, "leet")) {
      return "leet";
    }
    if (hasTerm(metadata, "leet") && hasTerm(metadata, "der")) {
      return "leet-der";
    }
    if (hasTerm(metadata, "leet")) {
      return "leet";
    }
    if (hasTerm(metadata, "leips")) {
      return "leips";
    }
    return "leips";
  }
  if (hasTerm(filename, "leet") && hasTerm(filename, "der")) {
    return "leet-der";
  }
  if (hasTerm(filename, "leet")) {
    return "leet";
  }
  if (hasTerm(metadata, "leet") && hasTerm(metadata, "der")) {
    return "leet-der";
  }
  if (hasTerm(metadata, "leet")) {
    return "leet";
  }
  if (hasTerm(metadata, "leips")) {
    return "leips";
  }
  return "unknown";
}

function normalizeKindText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function hasTerm(value: string, term: string): boolean {
  return new RegExp(`(^|\\s)${term}(\\s|$)`, "u").test(value);
}

function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

interface NumericTable {
  rows: number[][];
  width: number;
}

/**
 * Parses the numeric block while keeping every cell at its original column, so that one
 * missing value never shifts later rows. Reading stops at a `0,0` terminator row.
 */
function parseNumericRows(rows: string[][]): NumericTable {
  const parsed: number[][] = [];
  let width = 0;
  for (const row of rows) {
    const values = row.map((cell) => Number.parseFloat(cell));
    if (values.length >= 2 && values[0] === 0 && values[1] === 0) {
      break;
    }
    parsed.push(values);
    width = Math.max(width, values.length);
  }
  return { rows: parsed, width };
}

/**
 * Builds one point list per y column from the rows where both x and that y are numeric.
 * Columns without any point are skipped, but the rest keep their original column index.
 */
function pointsByYColumn(table: NumericTable): { columnIndex: number; points: Point[] }[] {
  const yColumns: { columnIndex: number; points: Point[] }[] = [];
  for (let columnIndex = 1; columnIndex < table.width; columnIndex += 1) {
    const points: Point[] = [];
    for (const row of table.rows) {
      const x = row[0];
      const y = row[columnIndex];
      if (x !== undefined && y !== undefined && Number.isFinite(x) && Number.isFinite(y)) {
        points.push({ x, y });
      }
    }
    if (points.length > 0) {
      yColumns.push({ columnIndex, points });
    }
  }
  return yColumns;
}

function createDatasetId(sourceName: string, yIndex: number): string {
  const slug = sourceName
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "dataset"}-${yIndex}`;
}

function stripExtension(sourceName: string): string {
  return sourceName.replace(/\.[^.]+$/, "");
}

function axisLabelForKind(kind: SpectrumKind): string {
  if (kind === "leet" || kind === "leet-der" || kind === "leips") {
    return "Applied Bias Vbias / V";
  }
  if (kind === "reels") {
    return "Kinetic Energy / eV";
  }
  return "Binding Energy / eV";
}
