import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeMember {
  /**
   * Member registration request.
   *
   * Contains credentials for creating a new member account including
   * username, email, and password. The system validates uniqueness, format
   * requirements, and password strength before creating the account.
   */
  export type ICreate = {
    /**
     * Unique username for the account.
     *
     * Must be 3-20 characters containing only alphanumeric characters,
     * underscores, and hyphens. This will be the user's display identity
     * throughout the platform.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Unique email address for authentication.
     *
     * Used for login, account verification, and platform communications.
     * Must be a valid email format and unique across all platform users.
     */
    email: string & tags.Format<"email">;

    /**
     * Account password in plain text.
     *
     * Must be minimum 8 characters with at least one uppercase letter, one
     * lowercase letter, one number, and one special character. The backend
     * will hash this password before storage - clients send plain text.
     */
    password: string & tags.MinLength<8>;
  };

  /**
   * Member authorization response with profile and JWT tokens.
   *
   * Returned after successful registration or login, providing complete
   * member profile information and authentication tokens for API access.
   */
  export type IAuthorized = {
    /** Unique member account identifier. */
    id: string & tags.Format<"uuid">;

    /** Member's unique username. */
    username: string;

    /** Member's registered email address. */
    email: string & tags.Format<"email">;

    /** Whether the member has verified their email address. */
    email_verified: boolean;

    /** Optional member biography displayed on profile. */
    profile_bio?: string | undefined;

    /** URL to member's profile avatar image. */
    avatar_url?: string | undefined;

    /** Karma earned from votes on member's posts. */
    post_karma: number & tags.Type<"int32">;

    /** Karma earned from votes on member's comments. */
    comment_karma: number & tags.Type<"int32">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Member login request.
   *
   * Contains email and password credentials for authenticating existing
   * member accounts.
   */
  export type ILogin = {
    /** Registered email address for authentication. */
    email: string & tags.Format<"email">;

    /**
     * Account password in plain text.
     *
     * The client sends the plain text password which the backend verifies
     * against the stored hash.
     */
    password: string;
  };

  /**
   * Token refresh request.
   *
   * Contains the refresh token for obtaining a new access token without
   * credential re-entry.
   */
  export type IRefresh = {
    /** Valid refresh token from previous authentication. */
    refresh_token: string;
  };

  /**
   * Password change request for authenticated members.
   *
   * Requires current password verification before allowing password update.
   */
  export type IChangePassword = {
    /**
     * Current password for verification.
     *
     * Plain text password that must match the stored hash to authorize the
     * password change.
     */
    current_password: string;

    /**
     * New password to set.
     *
     * Must meet all password strength requirements: minimum 8 characters
     * with uppercase, lowercase, number, and special character.
     */
    new_password: string & tags.MinLength<8>;

    /**
     * Confirmation of new password.
     *
     * Must match new_password exactly to prevent typos.
     */
    new_password_confirmation: string;
  };

  /**
   * Password change confirmation response.
   *
   * Confirms that the password was successfully updated and other sessions
   * have been invalidated.
   */
  export type IPasswordChanged = {
    /** Indicates successful password change. */
    success: true;

    /**
     * Confirmation message.
     *
     * Typically 'Your password has been successfully changed.'
     */
    message: string;
  };

  /**
   * Email verification request.
   *
   * Contains the verification token from the email link to complete email
   * verification.
   */
  export type IVerifyEmail = {
    /**
     * Unique verification token from email link.
     *
     * The token parameter from the verification email URL, used to validate
     * the email verification request.
     */
    verification_token: string;
  };

  /**
   * Email verification confirmation response.
   *
   * Confirms that the email address has been successfully verified and the
   * account is fully activated.
   */
  export type IEmailVerified = {
    /** Indicates successful email verification. */
    success: true;

    /**
     * Confirmation message.
     *
     * Typically 'Your email has been successfully verified.'
     */
    message: string;
  };

  /**
   * Password reset request.
   *
   * Contains the email address for which a password reset link should be
   * sent.
   */
  export type IRequestPasswordReset = {
    /** Email address of the account requiring password reset. */
    email: string & tags.Format<"email">;
  };

  /**
   * Password reset request confirmation.
   *
   * Generic response that does not reveal whether the email exists in the
   * system, preventing account enumeration attacks.
   */
  export type IPasswordResetRequested = {
    /** Indicates request was processed. */
    success: true;

    /**
     * Generic confirmation message.
     *
     * Typically 'If that email address is registered, you will receive a
     * password reset link.' Does not reveal whether email exists for
     * security.
     */
    message: string;
  };

  /**
   * Password reset completion request.
   *
   * Contains the reset token and new password for completing the password
   * reset workflow.
   */
  export type IResetPassword = {
    /** Unique reset token from email link. */
    reset_token: string;

    /** New password meeting strength requirements. */
    new_password: string & tags.MinLength<8>;

    /** Confirmation of new password. */
    new_password_confirmation: string;
  };

  /**
   * Password reset completion confirmation.
   *
   * Confirms password was successfully reset and all sessions invalidated.
   */
  export type IPasswordResetCompleted = {
    /** Indicates successful password reset. */
    success: true;

    /** Confirmation message prompting user to log in with new password. */
    message: string;
  };

  /**
   * Email verification resend request.
   *
   * Contains the email address for which a new verification link should be
   * generated and sent.
   */
  export type IResendVerification = {
    /** Email address for which to resend verification link. */
    email: string & tags.Format<"email">;
  };

  /**
   * Verification email resend confirmation.
   *
   * Confirms that a new verification email has been sent with a fresh 24-hour
   * token.
   */
  export type IVerificationResent = {
    /** Indicates verification email was sent. */
    success: true;

    /** Confirmation message about email being sent. */
    message: string;
  };

  /** Member summary for list displays. */
  export type ISummary = {
    /** Member identifier. */
    id: string & tags.Format<"uuid">;

    /** Member username. */
    username: string;

    /** Avatar URL. */
    avatar_url?: string | undefined;
  };
}
