import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeModerator {
  /**
   * Moderator registration request.
   *
   * Contains credentials for creating a new moderator account with username,
   * email, and password.
   */
  export type ICreate = {
    /** Unique username for the moderator account. */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /** Unique email address for moderator authentication. */
    email: string & tags.Format<"email">;

    /**
     * Account password in plain text.
     *
     * The backend will hash this password securely before storage.
     */
    password: string & tags.MinLength<8>;
  };

  /**
   * Moderator authorization response with profile and JWT tokens.
   *
   * Returned after successful moderator registration or login.
   */
  export type IAuthorized = {
    /** Unique moderator account identifier. */
    id: string & tags.Format<"uuid">;

    /** Moderator's unique username. */
    username: string;

    /** Moderator's registered email address. */
    email: string & tags.Format<"email">;

    /** Whether the moderator has verified their email address. */
    email_verified: boolean;

    /** Optional moderator biography. */
    profile_bio?: string | undefined;

    /** URL to moderator's profile avatar. */
    avatar_url?: string | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Moderator login request.
   *
   * Contains email and password credentials for authenticating existing
   * moderator accounts.
   */
  export type ILogin = {
    /** Registered email address. */
    email: string & tags.Format<"email">;

    /** Account password in plain text. */
    password: string;
  };

  /** Moderator token refresh request. */
  export type IRefresh = {
    /** Valid refresh token from previous authentication. */
    refresh_token: string;
  };

  /** Moderator password reset request. */
  export type IPasswordResetRequest = {
    /** Email address of moderator account. */
    email: string & tags.Format<"email">;
  };

  /** Password reset request confirmation for moderator. */
  export type IPasswordResetResponse = {
    /** Indicates request was processed. */
    success: true;

    /** Generic confirmation message. */
    message: string;
  };

  /** Moderator password reset completion request. */
  export type IPasswordResetComplete = {
    /** Reset token from email link. */
    reset_token: string;

    /** New password meeting strength requirements. */
    new_password: string & tags.MinLength<8>;

    /** Confirmation of new password. */
    new_password_confirmation: string;
  };

  /** Moderator password reset completion confirmation. */
  export type IPasswordResetConfirmation = {
    /** Indicates successful password reset. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Moderator password change request. */
  export type IPasswordChange = {
    /** Current password for verification. */
    current_password: string;

    /** New password to set. */
    new_password: string & tags.MinLength<8>;

    /** Confirmation of new password. */
    new_password_confirmation: string;
  };

  /** Moderator password change confirmation. */
  export type IPasswordChangeConfirmation = {
    /** Indicates successful password change. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Moderator email verification request. */
  export type IEmailVerification = {
    /** Verification token from email link. */
    verification_token: string;
  };

  /** Moderator email verification confirmation. */
  export type IEmailVerificationConfirmation = {
    /** Indicates successful email verification. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Moderator logout confirmation. */
  export type ILogoutConfirmation = {
    /** Indicates successful logout. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /**
   * Moderator activity summary.
   *
   * Aggregated moderation engagement metrics.
   */
  export type IActivity = {
    /** Total moderation actions. */
    total_actions: number & tags.Type<"int32">;

    /** Reports reviewed. */
    total_reports_reviewed: number & tags.Type<"int32">;

    /** Content removals. */
    total_content_removals: number & tags.Type<"int32">;

    /** Bans issued. */
    total_bans_issued: number & tags.Type<"int32">;
  };
}
