export namespace ICivicBoardAdminLogout {
  /**
   * Logout request for the currently authenticated administrator. Invoking
   * this operation will mark the active row in civic_board_admin_sessions as
   * expired (sets expired_at) using the caller’s session context. No admin
   * identifiers are accepted from the client—the actor is determined from
   * authentication.
   */
  export type ICreate = {
    /**
     * Optional human-readable reason for logging out (e.g.,
     * "user_initiated", "security_rotation"). Used for audit trails in
     * civic_board_audit_logs; not persisted on civic_board_admins or
     * civic_board_admin_sessions beyond standard expired_at update.
     */
    reason?: string | undefined;
  };
}
