"""In-memory sliding-window limiter. Counts reset when the API restarts."""
from __future__ import annotations

import math
import threading
import time
from collections import defaultdict, deque
from typing import Callable


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        hits = self._hits[key]
        while hits and now - hits[0] >= self.window_seconds:
            hits.popleft()
        return hits

    def hit(self, key: str) -> int:
        """Records an attempt. Returns 0 if allowed, otherwise seconds to wait."""
        with self._lock:
            now = self._clock()
            hits = self._prune(key, now)
            if len(hits) >= self.limit:
                return max(1, math.ceil(self.window_seconds - (now - hits[0])))
            hits.append(now)
            if len(self._hits) > 10_000:
                for stale in [k for k in list(self._hits) if not self._prune(k, now)]:
                    del self._hits[stale]
            return 0

    def clear(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)
