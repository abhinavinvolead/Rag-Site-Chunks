#safe filenames, artifacts dirs

from pathlib import Path
import re

def safe_filename(name: str) -> str:
    name = name.strip().replace(' ', '_')
    name = re.sub(r'[^A-Za-z0-9_.\-]', '', name) #replaces part of strig thiss is not'^'
    #"My file @#$%.pdf" → "Myfile_.pdf"
    return name or 'file'


#returns a directory path for storing artifacts of a specific document. 
def doc_artifacts_dir(artifacts_root: Path, doc_id: str) -> Path:
    p = artifacts_root / doc_id #this safely creates : artifacts/doc1/
    p.mkdir(parents=True, exist_ok=True) #creates all missing parent directories (like mkdir -p in Linux) 
    #doesn’t raise an error if the directory already exists
    return p
