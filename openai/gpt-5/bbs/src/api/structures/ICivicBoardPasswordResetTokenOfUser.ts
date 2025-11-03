import { tags } from "typia";

export namespace ICivicBoardPasswordResetTokenOfUser {
  /**
   * Request DTO to initiate a password reset for a member account. Accepts an
   * email address and, if a matching civic_board_users row exists, creates a
   * civic_board_password_reset_tokens record (actor_type = "user", token,
   * expires_at, used = false) and a civic_board_password_reset_token_of_users
   * link. This operation is public and rate-limitable; it must not reveal
   * whether an account exists.
   */
  export type IRequest = {
    /**
     * Member email address used to identify a civic_board_users record when
     * issuing a password reset token. Corresponds to
     * civic_board_users.email (unique). The backend creates a
     * civic_board_password_reset_tokens row (actor_type = "user") and a
     * linked civic_board_password_reset_token_of_users row when applicable.
     * The response is uniform to avoid leaking whether the email exists.
     */
    email: string & tags.Format<"email">;
  };

  /**
   * Request DTO to confirm a member password reset by consuming a
   * civic_board_password_reset_tokens row (actor_type = "user") and updating
   * the linked civic_board_users.password_hash. The server validates token
   * freshness (expires_at), unused status (used = false), and association via
   * civic_board_password_reset_token_of_users, then marks the token as used
   * (used = true, used_at set). No authentication is required for this flow.
   */
  export type IConfirm = {
    /**
     * Opaque password reset token issued previously via POST
     * /auth/user/password/reset/request. This value must match
     * civic_board_password_reset_tokens.token for a record where actor_type
     * = "user", expires_at is still in the future, and used = false. See
     * Prisma model civic_board_password_reset_tokens (token, actor_type,
     * expires_at, used).
     */
    token: string;

    /**
     * New password in plain text supplied by the client. The backend hashes
     * this value and stores it into civic_board_users.password_hash for the
     * user associated through civic_board_password_reset_token_of_users.
     * NEVER submit pre-hashed values. See Prisma model civic_board_users
     * (password_hash).
     */
    password: string;
  };

  /**
   * Lightweight acknowledgement DTO returned by password reset endpoints for
   * members. It intentionally avoids leaking account existence or token
   * validity specifics. When used by the issuance endpoint, providers MAY
   * include expires_at to communicate the token’s expiry time; confirmation
   * typically returns only acknowledgement without exposing additional
   * details.
   */
  export type ISummary = {
    /**
     * Indicates that the password reset flow request or confirmation was
     * accepted for processing. For security, responses are uniform and do
     * not disclose whether an email address or token matched any account.
     * This is a generic acknowledgement for both issuance and confirmation
     * steps.
     */
    acknowledged: boolean;

    /**
     * UTC timestamp when the issued reset token expires, when applicable to
     * issuance responses. This property MAY be omitted when the system
     * avoids revealing issuance details. The token value itself is never
     * returned.
     */
    expires_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
