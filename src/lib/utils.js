// Utility functions shared across all modules

export const formatPrice = (p, isBRL) => {
  if (isBRL) return `R$ ${Number(p).toFixed(2).replace(".", ",")}`;
  return p >= 1000
    ? `$${Number(p).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : p >= 1
    ? `$${Number(p).toFixed(2)}`
    : `$${Number(p).toFixed(4)}`;
};

export const formatChange = (c) =>
  c !== undefined ? `${c >= 0 ? "+" : ""}${c.toFixed(1)}%` : "";

export const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

export const formatDate = () =>
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const formatTime = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const isToday = (d) => d === new Date().toISOString().split("T")[0];

export const isPast = (d) => d < new Date().toISOString().split("T")[0];

export const getDayLabel = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + "T12:00:00");
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export const getTimeInTimezone = (tz) => {
  try {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  } catch {
    return "—";
  }
};

export const isInPeakHour = (peakHours, timezone) => {
  const nowStr = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "UTC",
  });
  const [nowH, nowM] = nowStr.split(":").map(Number);
  const current = nowH * 60 + nowM;
  return peakHours?.some((range) => {
    const clean = range.replace(/\s+[A-Z]{2,4}$/i, "");
    const match = clean.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (!match) return false;
    const start = parseInt(match[1]) * 60 + parseInt(match[2]);
    const end = parseInt(match[3]) * 60 + parseInt(match[4]);
    if (end <= start) return current >= start || current < end;
    return current >= start && current < end;
  });
};

export const extractRules = (systemPrompt) => {
  const rulesIdx = systemPrompt.indexOf("REGRAS");
  if (rulesIdx === -1) return "Seguir tom de voz padrão do cliente.";
  const formatosIdx = systemPrompt.indexOf("FORMATOS", rulesIdx);
  const exemplosIdx = systemPrompt.indexOf("EXEMPLOS", rulesIdx);
  const candidates = [formatosIdx, exemplosIdx].filter((i) => i > rulesIdx);
  const endIdx =
    candidates.length > 0 ? Math.min(...candidates) : systemPrompt.length;
  return systemPrompt.substring(rulesIdx, endIdx).trim();
};

// File processing (for Reports module)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 8;
export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.gif,.csv,.xlsx,.xls";
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export const fmtSize = (b) =>
  b < 1024
    ? `${b}B`
    : b < 1048576
    ? `${(b / 1024).toFixed(1)}KB`
    : `${(b / 1048576).toFixed(1)}MB`;

export const processFile = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE)
      return reject(new Error(`Muito grande: ${fmtSize(file.size)} (max 10MB)`));
    const ext = "." + file.name.toLowerCase().split(".").pop();
    const isImg = IMAGE_EXTS.includes(ext);
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Erro ao ler: ${file.name}`));
    const mkId = () => `f${Date.now()}${Math.random().toString(36).slice(2, 5)}`;

    if (isImg) {
      reader.onload = () =>
        resolve({
          id: mkId(),
          name: file.name,
          kind: "image",
          size: file.size,
          mediaType: file.type || "image/png",
          base64: reader.result.split(",")[1],
          thumbnail: reader.result,
        });
      reader.readAsDataURL(file);
    } else if (ext === ".csv") {
      reader.onload = () => {
        try {
          const lines = reader.result.split("\n").filter((l) => l.trim());
          if (lines.length < 1) return reject(new Error("CSV vazio"));
          const header = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^"|"$/g, ""));
          const rows = lines.slice(1, 201).map((line) => {
            const vals = line
              .split(",")
              .map((v) => v.trim().replace(/^"|"$/g, ""));
            const obj = {};
            header.forEach((h, i) => (obj[h] = vals[i] || ""));
            return obj;
          });
          resolve({
            id: mkId(),
            name: file.name,
            kind: "spreadsheet",
            size: file.size,
            totalRows: lines.length - 1,
            columns: header,
            preview: rows.slice(0, 4),
            csvText: lines.slice(0, 201).join("\n"),
            truncated: lines.length - 1 > 200,
          });
        } catch (e) {
          reject(new Error(`Erro CSV: ${e.message}`));
        }
      };
      reader.readAsText(file);
    } else if (ext === ".xlsx" || ext === ".xls") {
      reader.onload = async () => {
        try {
          const XLSX = await import("xlsx");
          const wb = XLSX.read(new Uint8Array(reader.result), { type: "array" });
          const sheets = wb.SheetNames.slice(0, 5).map((name) => {
            const ws = wb.Sheets[name];
            const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
            const csv = XLSX.utils.sheet_to_csv(ws).substring(0, 6000);
            return {
              name,
              csv,
              rows: json.length,
              columns: json.length ? Object.keys(json[0]) : [],
            };
          });
          resolve({
            id: mkId(),
            name: file.name,
            kind: "spreadsheet",
            size: file.size,
            totalRows: sheets.reduce((s, sh) => s + sh.rows, 0),
            columns: sheets[0]?.columns || [],
            preview: null,
            sheets,
            csvText: sheets
              .map((s) => `[${s.name}] (${s.rows} linhas)\n${s.csv}`)
              .join("\n\n"),
            truncated: false,
          });
        } catch {
          resolve({
            id: mkId(),
            name: file.name,
            kind: "spreadsheet",
            size: file.size,
            totalRows: 0,
            columns: [],
            preview: null,
            csvText: `[${file.name}] — Não foi possível processar automaticamente. Exporte como CSV para melhor resultado.`,
            truncated: false,
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Tipo não suportado: ${ext}`));
    }
  });
