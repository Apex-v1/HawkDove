// lib/auth.ts
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'hawk2024admin'
export const PLAYER_JOIN_CODE = process.env.PLAYER_JOIN_CODE || '' // if empty, no code needed for players

export function checkAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD
}
