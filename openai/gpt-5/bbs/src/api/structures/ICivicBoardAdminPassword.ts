import { tags } from "typia";

export namespace ICivicBoardAdminPassword {
  /**
   * Password change request for the currently authenticated administrator.
   * This DTO carries only business inputs (plain current and new passwords
   * with explicit length constraints). It intentionally does not expose
   * database columns or actor IDs. Internally, the service verifies
   * current_password against civic_board_admins.password_hash and, on
   * success, replaces it with a new hash and expires prior
   * civic_board_admin_sessions (except possibly the current session per
   * policy).
   */
  export type IUpdate = {
    /**
     * Current administrator credential in plain text for verification (must
     * be non-empty). The backend validates this against
     * civic_board_admins.password_hash and never stores or logs the plain
     * value. Do NOT supply any admin identifiers here; the authenticated
     * admin is derived from the session/JWT.
     */
    current_password: string & tags.MinLength<1>;

    /**
     * New administrator credential in plain text (min 8, max 2000
     * characters, aligned with admin join policy). The backend will hash
     * this value and update civic_board_admins.password_hash. Historical
     * sessions in civic_board_admin_sessions for this admin may be expired
     * as part of rotation per security policy.
     */
    new_password: string & tags.MinLength<8> & tags.MaxLength<2000>;
  };
}
