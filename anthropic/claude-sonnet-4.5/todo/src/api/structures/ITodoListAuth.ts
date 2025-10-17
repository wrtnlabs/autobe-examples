import { tags } from "typia";

export namespace ITodoListAuth {
  /**
   * Token refresh request for obtaining new access tokens.
   *
   * Contains the refresh token that will be validated against stored tokens
   * to issue a new access token. The system checks the token's signature,
   * expiration, and revocation status before generating new credentials.
   */
  export type IRefreshTokenRequest = {
    /**
     * Valid refresh token for renewal.
     *
     * The refresh token to validate and use for obtaining a new access
     * token. Must be a valid, non-expired, non-revoked token from the
     * system.
     */
    refresh_token: string;
  };

  /**
   * Token refresh response with new credentials.
   *
   * Returned after successful refresh token validation. Contains a new access
   * token for continued API access and optionally a new refresh token if
   * rotation is enabled.
   */
  export type ITokenResponse = {
    /**
     * New JWT access token.
     *
     * Freshly generated access token with 30-minute expiration. Contains
     * the same user claims as the original but with updated timestamps.
     */
    access_token: string;

    /**
     * New or existing refresh token.
     *
     * If token rotation is enabled, this is a new refresh token. Otherwise,
     * the same refresh token that was submitted. Valid for 30 days from
     * issuance.
     */
    refresh_token: string;

    /**
     * New access token expiration.
     *
     * When the newly issued access token will expire. Set to 30 minutes
     * from current time.
     */
    expires_at: string & tags.Format<"date-time">;
  };

  /**
   * Email verification request containing verification token.
   *
   * Contains the token needed to verify a user's email address. The token is
   * validated against stored verification data to activate the user account.
   */
  export type IVerifyEmailRequest = {
    /**
     * Email verification token.
     *
     * Unique token sent to the user's email address during registration.
     * Used to verify ownership of the email address. Single-use token that
     * expires after 24 hours.
     */
    token: string;
  };

  /**
   * Email verification confirmation response.
   *
   * Returned after email verification attempt to confirm success or provide
   * error information.
   */
  export type IVerifyEmailResponse = {
    /**
     * Verification result message.
     *
     * Confirms successful email verification or provides error details if
     * verification failed.
     */
    message: string;
  };
}
