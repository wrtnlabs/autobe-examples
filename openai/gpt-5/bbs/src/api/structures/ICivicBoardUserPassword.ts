import { tags } from "typia";

export namespace ICivicBoardUserPassword {
  /**
   * Request DTO for in-session password change for the currently
   * authenticated member (authorizationActor: "user"). No actor identifiers
   * (e.g., user_id, session_id) are accepted from the client—identity is
   * derived from the JWT/session. On success, the backend updates
   * civic_board_users.password_hash and revokes other sessions by setting
   * civic_board_user_sessions.expired_at, leaving the current session
   * active.
   */
  export type IUpdate = {
    /**
     * Current credential submitted by the authenticated user to verify
     * ownership prior to changing the password. Server compares this plain
     * text against the stored hash in civic_board_users.password_hash. This
     * field is never persisted; only the verification result is used.
     */
    current_password: string;

    /**
     * New credential to be set for the account. The server hashes this
     * secret and stores the result in civic_board_users.password_hash,
     * updating civic_board_users.updated_at upon success. Business logic
     * may enforce strength/complexity rules; clients must send the plain
     * text value (never a hash).
     */
    new_password: string;
  };

  /**
   * Response DTO summarizing the result of an in-session password change.
   * Reflects whether the update to civic_board_users.password_hash succeeded
   * and how many other user sessions were revoked (expired). Contains no
   * sensitive data or tokens.
   */
  export type ISummary = {
    /**
     * Indicates whether the password change completed successfully,
     * including updating civic_board_users.password_hash and applying
     * session revocations for other sessions.
     */
    ok: boolean;

    /**
     * Number of other sessions that were terminated by setting
     * civic_board_user_sessions.expired_at for records linked via
     * civic_board_user_sessions.civic_board_user_id, excluding the current
     * session.
     */
    revoked_sessions: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Concise human-readable outcome message (e.g., "Password updated; 3
     * other sessions were signed out"). Useful for UX display. Optional and
     * for client guidance only.
     */
    message?: string | undefined;
  };
}
