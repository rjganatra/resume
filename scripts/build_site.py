from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from pylatexenc.latex2text import LatexNodes2Text
except Exception:
    LatexNodes2Text = None

ROOT = Path(__file__).resolve().parents[1]
TEX_FILE = ROOT / "resume.tex"
SITE_DIR = ROOT / "site"
DIST_DIR = ROOT / "dist"


def read_tex() -> str:
    if not TEX_FILE.exists():
        raise FileNotFoundError("resume.tex not found at repository root.")
    return TEX_FILE.read_text(encoding="utf-8", errors="replace")


def strip_comments(tex: str) -> str:
    # Removes LaTeX comments but preserves escaped percent signs such as \%.
    return re.sub(r"(?<!\\)%.*", "", tex)


def get_document_body(tex: str) -> str:
    match = re.search(r"\\begin\{document\}(.*?)\\end\{document\}", tex, re.S)
    return match.group(1) if match else tex


def latex_to_text(value: str) -> str:
    value = value.replace(r"\&", "&").replace(r"\%", "%")
    value = re.sub(r"\\href\{([^{}]+)\}\{([^{}]+)\}", r"\2", value)
    value = re.sub(r"\\url\{([^{}]+)\}", r"\1", value)
    value = re.sub(r"\\textbf\{([^{}]+)\}", r"\1", value)
    value = re.sub(r"\\textit\{([^{}]+)\}", r"\1", value)
    value = re.sub(r"\\emph\{([^{}]+)\}", r"\1", value)
    value = re.sub(r"\{\\(?:Huge|LARGE|Large|large|small|footnotesize)\s+([^{}]+)\}", r"\1", value)
    if LatexNodes2Text:
        try:
            value = LatexNodes2Text().latex_to_text(value)
        except Exception:
            pass
    value = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?", " ", value)
    value = re.sub(r"[{}]", "", value)
    value = value.replace("~", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def extract_contacts(tex: str) -> dict[str, Any]:
    text = latex_to_text(tex)
    email = None
    phone = None
    linkedin = None

    email_match = re.search(r"[\w.\-+]+@[\w.\-]+\.\w+", tex)
    if email_match:
        email = email_match.group(0)

    phone_match = re.search(r"(?<!\d)(?:\+?91[-\s]?)?[6-9]\d{9}(?!\d)", text)
    if phone_match:
        phone = phone_match.group(0)

    linkedin_match = re.search(r"https?://(?:www\.)?linkedin\.com/[^\s}]+", tex, re.I)
    if linkedin_match:
        linkedin = linkedin_match.group(0)

    urls = re.findall(r"https?://[^\s}]+", tex)
    return {"email": email, "phone": phone, "linkedin": linkedin, "urls": urls}


def extract_name(body: str) -> str:
    patterns = [
        r"\\textbf\{\\Huge\s+([^{}]+)\}",
        r"\{\\Huge\s+\\textbf\{([^{}]+)\}\}",
        r"\\name\{([^{}]+)\}",
        r"\\textbf\{([^{}]{3,80})\}",
    ]
    for pat in patterns:
        match = re.search(pat, body)
        if match:
            name = latex_to_text(match.group(1))
            if 2 <= len(name.split()) <= 5:
                return name
    center = re.search(r"\\begin\{center\}(.*?)\\end\{center\}", body, re.S)
    if center:
        for line in center.group(1).splitlines():
            clean = latex_to_text(line)
            if 2 <= len(clean.split()) <= 5 and "@" not in clean:
                return clean
    return "Resume"


def split_sections(body: str) -> list[dict[str, str]]:
    # Supports common section styles: \section, \section*, \cvsection, \resumeSection.
    pattern = re.compile(
        r"\\(?:section|section\*|cvsection|resumeSection)\{([^{}]+)\}",
        re.I
    )
    matches = list(pattern.finditer(body))

    if not matches:
        # Fallback for resumes using comment banners like %-----------EXPERIENCE-----------
        return [{"title": "Resume", "raw": body}]

    sections = []
    for idx, match in enumerate(matches):
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(body)
        sections.append({"title": latex_to_text(match.group(1)), "raw": body[start:end].strip()})
    return sections


def parse_itemize_blocks(raw: str) -> tuple[list[str], str]:
    bullets = []
    def replace_block(match):
        block = match.group(1)
        for item in re.split(r"\\item", block):
            cleaned = latex_to_text(item)
            if cleaned:
                bullets.append(cleaned)
        return "\n"
    remaining = re.sub(r"\\begin\{itemize\}(.*?)\\end\{itemize\}", replace_block, raw, flags=re.S)
    return bullets, remaining


def parse_resume_subheadings(raw: str) -> list[dict[str, Any]]:
    entries = []
    # Common template: \resumeSubheading{Title}{Date}{Org}{Location}
    sub_pat = re.compile(
        r"\\resumeSubheading\{([^{}]*)\}\{([^{}]*)\}\{([^{}]*)\}\{([^{}]*)\}",
        re.S
    )
    matches = list(sub_pat.finditer(raw))
    for i, m in enumerate(matches):
        entry_raw_start = m.end()
        entry_raw_end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        block = raw[entry_raw_start:entry_raw_end]
        bullets, _ = parse_itemize_blocks(block)
        entries.append({
            "title": latex_to_text(m.group(1)),
            "date": latex_to_text(m.group(2)),
            "subtitle": latex_to_text(m.group(3)),
            "location": latex_to_text(m.group(4)),
            "bullets": bullets
        })
    return entries


def parse_bold_entries(raw: str) -> list[dict[str, Any]]:
    # Handles simple resumes using \textbf{Role} \hfill Date \\ \textit{Company}
    entries = []
    chunks = re.split(r"(?=\\textbf\{)", raw)
    for chunk in chunks:
        if "\\textbf{" not in chunk:
            continue
        title_match = re.search(r"\\textbf\{([^{}]+)\}", chunk)
        if not title_match:
            continue

        title = latex_to_text(title_match.group(1))
        date = ""
        date_match = re.search(r"\\hfill\s*([^\\\\\n]+)", chunk)
        if date_match:
            date = latex_to_text(date_match.group(1))

        subtitle = ""
        subtitle_match = re.search(r"\\textit\{([^{}]+)\}", chunk)
        if subtitle_match:
            subtitle = latex_to_text(subtitle_match.group(1))
        else:
            after = chunk[title_match.end():].split(r"\begin{itemize}")[0]
            lines = [latex_to_text(x) for x in re.split(r"\\\\|\n", after) if latex_to_text(x)]
            lines = [x for x in lines if x != date]
            if lines:
                subtitle = lines[0]

        bullets, remaining = parse_itemize_blocks(chunk)
        body_text = latex_to_text(remaining)
        if title and (bullets or subtitle or date):
            entries.append({
                "title": title,
                "date": date,
                "subtitle": subtitle,
                "location": "",
                "bullets": bullets,
                "body": body_text if not bullets else ""
            })
    return entries


def parse_plain_section(raw: str) -> dict[str, Any]:
    bullets, remaining = parse_itemize_blocks(raw)
    text = latex_to_text(remaining)
    # Convert comma-heavy skills sections to chips.
    comma_parts = [p.strip() for p in text.split(",") if p.strip()]
    if len(comma_parts) >= 5:
        return {"type": "chips", "items": comma_parts}
    if bullets:
        return {"type": "list", "text": text, "items": bullets}
    return {"type": "text", "text": text}


def parse_section(section: dict[str, str]) -> dict[str, Any]:
    title = section["title"]
    raw = section["raw"]
    entries = parse_resume_subheadings(raw)
    if not entries:
        entries = parse_bold_entries(raw)
    if entries:
        return {"title": title, "type": "timeline", "entries": entries}
    parsed = parse_plain_section(raw)
    return {"title": title, **parsed}


def build_data() -> dict[str, Any]:
    tex = strip_comments(read_tex())
    body = get_document_body(tex)
    name = extract_name(body)
    contacts = extract_contacts(body)
    sections = [parse_section(s) for s in split_sections(body)]
    return {
        "name": name,
        "headline": "Interactive Resume",
        "contacts": contacts,
        "sections": sections,
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }


def copy_site_files() -> None:
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    shutil.copytree(SITE_DIR, DIST_DIR)
    pdf = ROOT / "resume.pdf"
    if pdf.exists():
        shutil.copy2(pdf, DIST_DIR / "resume.pdf")


def main() -> None:
    data = build_data()
    copy_site_files()
    (DIST_DIR / "resume-data.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Built adaptive resume website with {len(data['sections'])} section(s).")


if __name__ == "__main__":
    main()