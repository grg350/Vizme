// src/repositories/refreshToken.repository.ts
import { pool } from "../db/pool.js";
import crypto from "crypto";

export const refreshTokenRepository = {
  // Hash token before storing (security best practice)
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  },

  async save(userId: string, token: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(token);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  async findByToken(
    token: string,
  ): Promise<{ user_id: string; expires_at: Date } | null> {
    const tokenHash = this.hashToken(token);
    const result = await pool.query(
      `SELECT user_id, expires_at FROM refresh_tokens
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] || null;
  },

  async deleteByToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
      tokenHash,
    ]);
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
  },

  // Cleanup expired tokens (run periodically)
  async deleteExpired(): Promise<void> {
    await pool.query("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
  },
};
