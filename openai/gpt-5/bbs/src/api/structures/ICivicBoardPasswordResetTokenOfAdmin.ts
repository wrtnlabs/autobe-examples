import { tags } from "typia";

export namespace ICivicBoardPasswordResetTokenOfAdmin {
  /**
   * Password reset request payload for administrators. Accepts an email to
   * provision a reset token by writing to civic_board_password_reset_tokens
   * and binding it via civic_board_password_reset_token_of_admins. No session
   * is established and no sensitive data is returned. Security controls such
   * as rate limits may be enforced using civic_board_rate_limits. Note: This
   * DTO does not correspond 1:1 to a Prisma model and therefore does not
   * declare x-autobe-prisma-schema.
   */
  export type ICreate = {
    /**
     * Administrator email address used to locate the target
     * civic_board_admins row and issue a password reset token. The flow
     * inserts into civic_board_password_reset_tokens (actor_type="admin",
     * token, expires_at, used=false) and creates the specialization row in
     * civic_board_password_reset_token_of_admins referencing the admin.
     * This request does not modify civic_board_admins.
     */
    email: string & tags.Format<"email">;
  };
}
