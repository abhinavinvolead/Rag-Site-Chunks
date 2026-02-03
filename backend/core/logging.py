#simple logger, the code creates a single reusable logger that prints clean, formatted log messages to console.
# example : 
# [INFO] Index built
# [WARNING] Missing PDF
# [ERROR] Something failed


import logging

LOGGER_NAME = "rag_app" #name of the logger like a tag

_logger = None #ensures only one logger is created

def get_logger():
    global _logger
    if _logger is None:
        _logger = logging.getLogger(LOGGER_NAME) #shows messages of level INFO and above
        _logger.setLevel(logging.INFO)
        if not _logger.handlers:
            h = logging.StreamHandler()
            fmt = logging.Formatter('[%(levelname)s] %(message)s')
            h.setFormatter(fmt)
            _logger.addHandler(h) #this will format all log messages like "[INFO] Some message"
    return _logger



# use it anywhere using: 

# from core.logging import get_logger
# logger = get_logger()
# logger.info("Building index...")
