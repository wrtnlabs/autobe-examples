import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeAdmin {
  /**
   * Administrator registration request.
   *
   * Contains credentials for creating a new administrator account.
   */
  export type ICreate = {
    /** Unique username for the administrator account. */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /** Unique email address for administrator authentication. */
    email: string & tags.Format<"email">;

    /** Account password in plain text. */
    password: string & tags.MinLength<8>;
  };

  /** Administrator authorization response with profile and JWT tokens. */
  export type IAuthorized = {
    /** Unique administrator account identifier. */
    id: string & tags.Format<"uuid">;

    /** Administrator's unique username. */
    username: string;

    /** Administrator's registered email address. */
    email: string & tags.Format<"email">;

    /** Whether the administrator has verified their email. */
    email_verified: boolean;

    /** Whether this administrator has super admin privileges. */
    is_super_admin: boolean;

    /** Optional administrator biography. */
    profile_bio?: string | undefined;

    /** URL to administrator's profile avatar. */
    avatar_url?: string | undefined;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** Administrator login request. */
  export type ILogin = {
    /** Registered email address. */
    email: string & tags.Format<"email">;

    /** Account password in plain text. */
    password: string;
  };

  /** Administrator token refresh request. */
  export type IRefresh = {
    /** Valid refresh token from previous authentication. */
    refresh_token: string;
  };

  /** Administrator password reset request. */
  export type IPasswordResetRequest = {
    /** Email address of administrator account. */
    email: string & tags.Format<"email">;
  };

  /** Administrator password reset completion request. */
  export type IPasswordResetComplete = {
    /** Reset token from email link. */
    reset_token: string;

    /** New password meeting strength requirements. */
    new_password: string & tags.MinLength<8>;

    /** Confirmation of new password. */
    new_password_confirmation: string;
  };

  /** Administrator password change request. */
  export type IPasswordChange = {
    /** Current password for verification. */
    current_password: string;

    /** New password to set. */
    new_password: string & tags.MinLength<8>;

    /** Confirmation of new password. */
    new_password_confirmation: string;
  };

  /** Administrator password change confirmation. */
  export type IPasswordChangeResponse = {
    /** Indicates successful password change. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Administrator email verification request. */
  export type IEmailVerification = {
    /** Verification token from email link. */
    verification_token: string;
  };

  /** Administrator email verification confirmation. */
  export type IEmailVerificationResponse = {
    /** Indicates successful email verification. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Administrator verification email resend confirmation. */
  export type IResendVerificationResponse = {
    /** Indicates verification email was sent. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Administrator logout confirmation. */
  export type ILogoutResponse = {
    /** Indicates successful logout. */
    success: true;

    /** Confirmation message. */
    message: string;
  };

  /** Administrator password reset request confirmation. */
  export type IPasswordResetRequestResponse = {
    /** Indicates request was processed. */
    success: true;

    /** Generic confirmation message. */
    message: string;
  };

  /** Administrator password reset completion confirmation. */
  export type IPasswordResetCompleteResponse = {
    /** Indicates successful password reset. */
    success: true;

    /** Confirmation message. */
    message: string;
  };
}
