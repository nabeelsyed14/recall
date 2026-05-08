import asyncio
import json
from core.pdf_export import generate_content_pdf

async def test():
    content = {
        'title': 'Test Video Title',
        'source_url': 'https://youtube.com/watch?v=test123',
        'summary': 'A test summary with some content to verify the PDF works.',
        'key_insights': json.dumps([
            'First key insight about the topic.',
            'Second key insight with important details.',
            'Third insight explaining the main concept.'
        ])
    }
    questions = [{
        'question_text': 'What is the main topic?',
        'answer_text': 'The correct answer',
        'distractor_options': json.dumps(['Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3'])
    }]
    highlights = [{'text': 'A highlighted passage from the content'}]
    
    try:
        pdf = await generate_content_pdf(content, questions, highlights)
        with open('_test_output.pdf', 'wb') as f:
            f.write(pdf)
        print(f'PDF saved: {len(pdf)} bytes')
        print(f'First bytes: {pdf[:20]}')
        print(f'Starts with %PDF: {pdf[:4] == b"%PDF"}')
    except Exception as e:
        import traceback
        print(f'Error: {e}')
        traceback.print_exc()

asyncio.run(test())
