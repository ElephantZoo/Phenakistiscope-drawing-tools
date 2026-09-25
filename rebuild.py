from pathlib import Path
import re

root = Path(__file__).parent
original = (root / 'index.original.html').read_text(encoding='utf-8')
css = re.search(r'<style>(.*?)</style>', original, re.S).group(1)
js = re.search(r'<script>(.*?)</script>', original, re.S).group(1)
(root / 'assets/base.css').write_text(css, encoding='utf-8')
(root / 'assets/app.js').write_text(js, encoding='utf-8')
html = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="assets/base.css" />\n    <link rel="stylesheet" href="assets/workspace.css" />', original, count=1, flags=re.S)
html = re.sub(r'<script>.*?</script>', '<script src="assets/app.js"></script>\n    <script src="assets/workspace.js"></script>', html, count=1, flags=re.S)
html = html.replace('maximum-scale=1.0, user-scalable=no, ', '')
html = html.replace('id="welcomeModal" class="modal-overlay"', 'id="welcomeModal" class="modal-overlay" style="display: none"')
start = html.index('    <div class="viewport" id="viewport">')
end = html.index('    <div id="selectionActions"', start)
html = html[:start] + (root / 'workspace.html').read_text(encoding='utf-8') + '\n' + html[end:]
(root / 'index.html').write_text(html, encoding='utf-8')
