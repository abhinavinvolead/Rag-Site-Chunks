## retriever (MMR/similarity), basic search helpers

from typing import List
from langchain_community.vectorstores import FAISS

#LangChain’s FAISS wrapper
def similarity_search(vs: FAISS, query: str, k: int = 6) -> List:
    return vs.similarity_search(query, k=k)
# Converts query into an embedding. Finds the top k most similar vectors. Returns a list of Document objects


def similarity_search_with_score(vs: FAISS, query: str, k: int = 10):
    return vs.similarity_search_with_score(query, k=k)
# Lower score = more similar (FAISS distance).


def as_retriever(vs: FAISS, *, k: int = 6, fetch_k: int = 30, use_mmr: bool = True):
    return vs.as_retriever(search_kwargs={
        "k": k, # Number of documents returned after ranking.
        "fetch_k": fetch_k, # Number of candidate documents fetched before reranking (used by MMR).
        "lambda_mult": 0.8, #Controls MMR balance: 
    }, search_type="mmr" if use_mmr else "similarity")


#Maximal Marginal Relevance: return results that are relevant to the query and not redundant with each other
#Plain similarity search often returns:5 chunks saying almost the same thing
# and the MMR tries to return: 5 chunks that are all relevant but cover different aspects


# working of MMR: 
#Convert the query to an embedding -> Fetch fetch_k most similar chunks (e.g. 30)
#Re-rank them using MMR: 1. reward similarity to the query. 2. penalize similarity to already-selected chunks
#Return the best k results (e.g. 6)

# lambda_mult controls the tradeoff:

# 1.0 → pure similarity (less diversity)

# 0.0 → maximum diversity (less relevance)

# 0.5 → balanced (your default)