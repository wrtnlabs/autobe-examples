import { tags } from "typia";

export namespace ITodoAppAuth {
  /**
   * Token refresh request containing the current refresh token.
   *
   * Submitted to obtain new access token without re-authentication.
   */
  export type IRefreshTokenRequest = {
    /**
     * Refresh token for obtaining new access token.
     *
     * Must be valid, non-expired refresh token issued during login or
     * previous refresh.
     */
    refreshToken: string;
  };

  /**
   * New access token response following successful refresh token validation.
   *
   * Contains JWT access token and optional new refresh token for token
   * rotation.
   */
  export type ITokenResponse = {
    /** New JWT access token for authentication in subsequent requests. */
    access_token: string;

    /** Token type indicating JWT Bearer token format. */
    token_type: "Bearer";

    /** New token expiration time in seconds. */
    expires_in: number & tags.Type<"int32">;

    /** New refresh token for token rotation (optional if rotating tokens). */
    refresh_token?: string | undefined;
  };

  /**
   * Response confirming successful logout and token invalidation.
   *
   * Session has been terminated and tokens have been revoked.
   */
  export type ILogoutResponse = {
    /**
     * Confirmation message indicating successful logout and session
     * termination.
     */
    message: string;
  };

  /**
   * Request body for email verification during registration completion.
   *
   * Submits verification token to confirm email address and activate account.
   */
  export type IVerifyEmailRequest = {
    /**
     * Email verification token from verification link. Cryptographically
     * secure token valid for 24 hours.
     */
    token: string & tags.MinLength<32>;
  };

  /**
   * Response confirming successful email verification and account activation.
   *
   * User can now log in with their credentials.
   */
  export type IVerifyEmailResponse = {
    /**
     * Confirmation message indicating email has been verified and account
     * is now active.
     */
    message: string;
  };

  /**
   * Request body for password reset request.
   *
   * Initiates password reset workflow by email address.
   */
  export type IRequestPasswordResetRequest = {
    /** Email address for which password reset is requested. */
    email: string & tags.Format<"email">;
  };

  /**
   * Response confirming password reset email sent (generic message for
   * security).
   *
   * Does not reveal whether email exists in system.
   */
  export type IRequestPasswordResetResponse = {
    /**
     * Generic confirmation message. Same for valid and invalid emails to
     * prevent user enumeration.
     */
    message: string;
  };

  /**
   * Request body for resetting password using reset token.
   *
   * Completes password reset workflow with new password and token
   * verification.
   */
  export type IResetPasswordRequest = {
    /** Password reset token from reset email link. Valid for 1 hour. */
    token: string & tags.MinLength<32>;

    /** New password meeting security requirements. */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /** Confirmation of new password. Must match new_password exactly. */
    new_password_confirm: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Response confirming successful password reset.
   *
   * User can now log in with new password.
   */
  export type IResetPasswordResponse = {
    /** Confirmation message indicating password has been reset successfully. */
    message: string;
  };

  /**
   * Request body for authenticated user to change their password.
   *
   * Requires current password verification and new password confirmation for
   * security.
   */
  export type IChangePasswordRequest = {
    /**
     * User's current password for verification before change. System
     * validates this matches stored hash.
     */
    current_password: string;

    /**
     * New password meeting security requirements: minimum 8 characters
     * including uppercase, lowercase, digit, special character.
     */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /** Confirmation of new password. Must match new_password field exactly. */
    new_password_confirm: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Response confirming successful password change.
   *
   * User must re-authenticate with new password on next login.
   */
  export type IChangePasswordResponse = {
    /**
     * Confirmation message indicating password has been changed
     * successfully.
     */
    message: string;
  };
}
