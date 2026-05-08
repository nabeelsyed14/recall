import json
from fpdf import FPDF


def _safe(text, maxlen=5000):
    """Strip non-Latin-1 characters so the default PDF font can render."""
    text = str(text)[:maxlen]
    return text.encode("latin-1", errors="replace").decode("latin-1", errors="replace")


class RecallPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() == 1:
            self.set_font("Helvetica", "B", 10)
            self.set_text_color(124, 58, 237)
            self.cell(0, 8, "Recall - Personal Knowledge Hub", align="R")
            self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(124, 58, 237)
        self.cell(0, 10, _safe(title, 80))
        self.ln(8)

    def body_text(self, text):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, _safe(text))
        self.ln(4)

    def quote_text(self, text):
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(80, 80, 80)
        safe = _safe(text, 2000).replace('"', "'")
        self.set_x(self.l_margin + 10)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 20, 5, f'"{safe}"')
        self.ln(3)


async def generate_content_pdf(content: dict, questions: list[dict], highlights: list[dict]) -> bytes:
    pdf = RecallPDF()
    pdf.add_page()

    title = _safe(content.get("title") or "Untitled", 200)
    source_url = str(content.get("source_url") or "")
    summary = _safe(content.get("summary") or "")
    ki_raw = content.get("key_insights") or "[]"

    if isinstance(ki_raw, str):
        try:
            parsed = json.loads(ki_raw)
            key_insights = parsed if isinstance(parsed, list) else [ki_raw]
        except Exception:
            key_insights = [ki_raw] if ki_raw.strip() else []
    elif isinstance(ki_raw, list):
        key_insights = ki_raw
    else:
        key_insights = []

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 12, title)
    pdf.ln(4)

    if source_url and source_url.startswith("http"):
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(100, 100, 200)
        pdf.cell(0, 6, source_url[:120])
        pdf.ln(12)

    if summary:
        pdf.section_title("Summary")
        pdf.body_text(summary)

    if key_insights:
        pdf.section_title("Key Insights")
        for i, insight in enumerate(key_insights, 1):
            pdf.body_text(f"{i}. {_safe(insight, 1000)}")

    if questions:
        pdf.add_page()
        pdf.section_title("Quiz Questions")
        for i, q in enumerate(questions, 1):
            question = _safe(q.get("question_text") or q.get("question", ""), 500)
            answer = _safe(q.get("answer_text") or q.get("answer", ""), 200)
            distractors_raw = q.get("distractor_options", "[]")
            if isinstance(distractors_raw, str):
                try:
                    distractors = json.loads(distractors_raw)
                except Exception:
                    distractors = []
            elif isinstance(distractors_raw, list):
                distractors = distractors_raw
            else:
                distractors = []

            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 7, f"Q{i}: {question}")
            pdf.ln(2)

            options = [_safe(o, 200) for o in distractors] + [answer]
            options = list(dict.fromkeys(options))
            import random
            random.shuffle(options)
            for opt in options:
                is_correct = opt == answer
                pdf.set_font("Helvetica", "I" if is_correct else "", 10)
                pdf.set_text_color(16, 185, 129) if is_correct else pdf.set_text_color(80, 80, 80)
                marker = ">> " if is_correct else "   "
                pdf.cell(10, 6, marker)
                pdf.cell(0, 6, opt[:120])
                pdf.ln(6)
            pdf.ln(6)

    if highlights:
        pdf.add_page()
        pdf.section_title("Your Highlights")
        for h in highlights:
            pdf.quote_text(h.get("text", ""))
            pdf.ln(2)

    return bytes(pdf.output())
