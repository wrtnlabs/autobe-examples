import { tags } from "typia";

export namespace IDiscussionBoardPasswordResetRequest {
  /**
   * Request body for initiating a password reset request for a contributor
   * account.
   *
   * This operation validates that the provided email address exists in the
   * system and generates a secure, time-limited token for password recovery.
   * The password reset token is sent via email to the registered address and
   * is valid for exactly 30 minutes from generation.
   *
   * The token is single-use and becomes invalid after one successful password
   * reset or after the 30-minute expiration window closes. If a contributor
   * requests multiple resets, only the most recent token remains valid.
   *
   * Contributors with suspended or deleted accounts cannot request password
   * resets, and the system returns generic responses for these cases to avoid
   * leaking account status information.
   */
  export type ICreate = {
    /**
     * Email address of the contributor account for which password reset is
     * requested. Must be a valid email format and match a registered
     * contributor account.
     *
     * Security considerations include rate limiting to prevent brute-force
     * enumeration attacks. The operation does not reveal whether an email
     * address is registered in the system to prevent account enumeration.
     * The response is generic regardless of whether the email exists or
     * account status.
     */
    email: string & tags.Format<"email">;
  };
}
