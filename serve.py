from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os, re

os.chdir(Path(__file__).parent)
class Handler(SimpleHTTPRequestHandler):
    # Video browsers request byte ranges when jumping to a chapter.
    def send_head(self):
        self.range_end=None
        match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
        path=Path(self.translate_path(self.path))
        if not match or not path.is_file():return super().send_head()
        length=path.stat().st_size
        start=int(match[1]);end=min(int(match[2]) if match[2] else length-1,length-1)
        if start>end:
            self.send_error(416,'Requested range not satisfiable');return None
        stream=path.open('rb');stream.seek(start);self.range_end=end-start+1
        self.send_response(206)
        self.send_header('Content-Type',self.guess_type(str(path)))
        self.send_header('Accept-Ranges','bytes')
        self.send_header('Content-Range',f'bytes {start}-{end}/{length}')
        self.send_header('Content-Length',str(self.range_end));self.end_headers()
        return stream
    def copyfile(self,source,outputfile):
        if self.range_end is None:return super().copyfile(source,outputfile)
        remaining=self.range_end
        while remaining:
            data=source.read(min(65536,remaining))
            if not data:break
            outputfile.write(data);remaining-=len(data)

print('Local: http://127.0.0.1:4188', flush=True)
ThreadingHTTPServer(('127.0.0.1',4188),Handler).serve_forever()
