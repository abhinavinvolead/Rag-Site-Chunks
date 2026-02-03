# concise grounded prompt with inline citation format

from langchain_core.prompts import ChatPromptTemplate

ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """
You are a concise and helpful assistant. Answer using ONLY the provided context.
If the answer is not in the context, say you don't know.

Context:
{context}

Question: {question}
Cite sources in the form [{{name}} p.{{page}}].
    """
)
