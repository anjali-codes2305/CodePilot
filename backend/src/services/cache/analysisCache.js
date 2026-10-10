/**
 * CodePilot High-Performance Analysis & Token Cache (Section 43)
 * 
 * Uses SHA-256 hashing to cache analysis results and avoid redundant
 * AST parsing and Gemini LLM calls for unchanged code and identical queries.
 */

import crypto from 'node:crypto';

class AnalysisCache {
  constructor(maxSize = 100, ttlMs = 1000 * 60 * 60) { // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  generateKey(code, language, mode) {
    const raw = `${language.trim().toLowerCase()}:${mode.trim().toLowerCase()}:${code.trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  get(code, language, mode) {
    const key = this.generateKey(code, language, mode);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(code, language, mode, data) {
    const key = this.generateKey(code, language, mode);

    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%' 
        : '0%'
    };
  }

  clear() {
    this.cache.clear();
  }
}

export const analysisCache = new AnalysisCache();
export default analysisCache;
