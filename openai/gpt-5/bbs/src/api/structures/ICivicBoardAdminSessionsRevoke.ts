import { IECivicBoardAdminSessionRevokeMode } from "./IECivicBoardAdminSessionRevokeMode";

export namespace ICivicBoardAdminSessionsRevoke {
  /**
   * Request body for revoking administrator sessions recorded in
   * civic_board_admin_sessions. This DTO MUST NOT accept any administrator
   * identifiers — the authenticated admin and current session are derived
   * from the JWT/session context. The backend updates rows in
   * civic_board_admin_sessions by setting expired_at according to the
   * selected mode.
   *
   * Prisma reference:
   *
   * - Civic_board_admin_sessions: id, civic_board_admin_id, ip, href, referrer,
   *   created_at, expired_at (nullable).
   * - Civic_board_admins: unchanged by this operation (email, password_hash,
   *   display_name, email_verified, suspended).
   */
  export type ICreate = {
    /**
     * Revocation scope selector. Determines whether all sessions for the
     * authenticated administrator are revoked, or all sessions except the
     * current session are revoked.
     */
    mode: IECivicBoardAdminSessionRevokeMode;
  };
}
