import { tags } from "typia";

export namespace ICivicBoardPasswordResetTokenOfAdminConfirm {
  /**
   * Request body to finalize an admin password reset using a previously
   * issued token. On success, the backend replaces
   * civic_board_admins.password_hash, marks the token as used (used=true,
   * used_at), and may expire existing sessions in civic_board_admin_sessions.
   * Security: Do NOT include any admin identifiers; identity is resolved from
   * the token specialization.
   */
  export type ICreate = {
    /**
     * Opaque password reset token previously issued and stored in
     * civic_board_password_reset_tokens.token with actor_type="admin". Must
     * be valid (not expired, not used) and linked via
     * civic_board_password_reset_token_of_admins to the target admin.
     */
    token: string & tags.MinLength<1>;

    /**
     * New password in plain text for verification and hashing on the server
     * side (min 8, max 2000 characters to match admin join policy). The
     * backend will hash this value and store it in
     * civic_board_admins.password_hash. Clients must NOT send pre-hashed
     * passwords.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<2000>;
  };
}
