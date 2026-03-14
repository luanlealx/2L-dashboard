import { C } from "../tokens.js";

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: C.textBright, fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : part
  );
}

export default function BriefingContent({ text }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.7 }}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i === 0 ? 0 : 28, marginBottom: 10 }}>
              <span style={{ width: 3, height: 16, borderRadius: 2, background: C.brand, flexShrink: 0, display: "inline-block" }} />
              <h3 style={{ color: C.textBright, fontWeight: 600, fontSize: 15, margin: 0 }}>
                {line.replace("## ", "")}
              </h3>
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, color: C.text, paddingLeft: 13, paddingTop: 3 }}>
              <span style={{ color: C.brand, fontWeight: 700, fontSize: 12, marginTop: 2, flexShrink: 0 }}>›</span>
              <span>{renderInline(line.replace(/^[-•]\s/, ""))}</span>
            </div>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} style={{ display: "flex", gap: 10, color: C.text, paddingLeft: 13, paddingTop: 3 }}>
              <span style={{ color: C.brand, fontFamily: "monospace", fontSize: 12, marginTop: 2, flexShrink: 0, minWidth: 14 }}>
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ""))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ color: C.text, paddingLeft: 13, margin: 0 }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
