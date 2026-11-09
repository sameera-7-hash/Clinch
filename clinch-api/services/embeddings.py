"""Local sentence embeddings for the PostgreSQL vectors (Pinecone keeps its own)."""
from __future__ import annotations

import threading


class Embedder:
    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def load(self) -> None:
        with self._lock:
            if self._model is None:
                # Imported here because torch alone adds seconds to API startup.
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self._model_name, device="cpu")

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.load()
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [vector.tolist() for vector in vectors]
