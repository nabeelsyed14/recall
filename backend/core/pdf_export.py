import json
import os
from fpdf import FPDF

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")


class RecallPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self._add_fonts()

    def _add_fonts(self):
        dejavu_regular = os.path.join(FONT_DIR, "DejaVuSans.ttf")
        dejavu_bold = os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")
        dejavu_italic = os.path.join(FONT_DIR, "DejaVuSans-Oblique.ttf")
        if os.path.exists(dejavu_regular):
            self.add_font("DejaVu", "", dejavu_regular, uni=True)
            self.add_font("DejaVu", "B", dejavu_bold, uni=True)
            self.add_font("DejaVu", "I", dejavu_italic, uni=True)
            self._font_family = "DejaVu"
        else:
            self._font_family = "Helvetica"

    def _font(self, style=""):
        return (self._font_family, style)

    def header(self):
        if self.page_no() == 1:
            self.set_font(*self._font("B"), 10)
            self.set_text_color(124, 58, 237)
            self.cell(0, 8, "Recall - Personal Knowledge Hub", align="R")
            self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font(*self._font("I"), 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title):
        self.set_font(*self._font("B"), 14)
        self.set_text_color(124, 58, 237)
        self.cell(0, 10, str(title)[:80])
        self.ln(8)

    def body_text(self, text):
        self.set_font(*self._font(), 11)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, str(text)[:5000])
        self.ln(4)

    def quote_text(self, text):
        self.set_font(*self._font("I"), 10)
        self.set_text_color(80, 80, 80)
        safe = str(text).replace('"', "'")[:2000]
        self.set_x(self.l_margin + 10)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 20, 5, f'"{safe}"')
        self.ln(3)


async def generate_content_pdf(content: dict, questions: list[dict], highlights: list[dict]) -> bytes:
    pdf = RecallPDF()
    pdf.add_page()

    title = str(content.get("title") or "Untitled")[:200]
    source_url = str(content.get("source_url") or "")
    summary = str(content.get("summary") or "")
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

    pdf.set_font(*pdf._font("B"), 22)
    pdf.set_text_color(30, 30, 30)
    pdf.multi_cell(0, 12, title)
    pdf.ln(4)

    if source_url and source_url.startswith("http"):
        pdf.set_font(*pdf._font(), 9)
        pdf.set_text_color(100, 100, 200)
        try:
            pdf.cell(0, 6, f"Source: {source_url[:120]}", link=source_url)
        except Exception:
            pdf.cell(0, 6, f"Source: {source_url[:120]}")
        pdf.ln(12)

    if summary:
        pdf.section_title("Summary")
        pdf.body_text(summary)

    if key_insights:
        pdf.section_title("Key Insights")
        for i, insight in enumerate(key_insights, 1):
            pdf.body_text(f"{i}. {str(insight)[:1000]}")

    if questions:
        pdf.add_page()
        pdf.section_title("Quiz Questions")
        for i, q in enumerate(questions, 1):
            question = str(q.get("question_text") or q.get("question", ""))[:500]
            answer = str(q.get("answer_text") or q.get("answer", ""))[:200]
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

            pdf.set_font(*pdf._font("B"), 12)
            pdf.set_text_color(30, 30, 30)
            pdf.multi_cell(0, 7, f"Q{i}: {question}")
            pdf.ln(2)

            options = [str(o) for o in distractors] + [str(answer)]
            options = list(dict.fromkeys(options))
            import random
            random.shuffle(options)
            for opt in options:
                is_correct = opt == str(answer)
                pdf.set_font(*pdf._font("I" if is_correct else ""), 10)
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

    return pdf.output()
