import { tags } from "typia";

export namespace ICivicBoardPasswordResetToken {
  /**
   * Password reset issuance acknowledgement DTO.
   *
   * This generic summary applies to password reset token requests (admin or
   * user). It intentionally avoids revealing whether an email/account exists.
   * When a token is actually issued, its expiry may be provided via
   * expires_at; the token value itself is never returned.
   */
  export type ISummary = {
    /**
     * Indicates that the password reset token issuance request was accepted
     * for processing in a privacy‑preserving manner. This acknowledgement
     * applies to both admin and user password reset flows; it does not
     * disclose whether an account exists.
     */
    acknowledged: boolean;

    /**
     * UTC timestamp when the issued reset token expires, if a token was
     * created. Corresponds to civic_board_password_reset_tokens.expires_at.
     * This value may be omitted when the system deliberately avoids
     * revealing issuance details.
     */
    expires_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
