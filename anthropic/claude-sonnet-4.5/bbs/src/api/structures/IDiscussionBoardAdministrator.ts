import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardAdministrator {
  /**
   * Administrator registration credentials.
   *
   * Creates new administrator account with platform control privileges.
   */
  export type ICreate = {
    /** Unique username for administrator account. */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /** Email address for administrator authentication. */
    email: string & tags.Format<"email">;

    /** Password in plain text for account security. */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /** Authorization response for administrator authentication. */
  export type IAuthorized = {
    /** Unique identifier of the authenticated administrator. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** Login credentials for administrator authentication. */
  export type ILogin = {
    /** Email address or username for login. */
    email: string;

    /** Password for authentication. */
    password: string;
  };

  /** Refresh token request for administrator access renewal. */
  export type IRefresh = {
    /** Current valid refresh token. */
    refresh_token: string;
  };

  /** Password reset request containing administrator email. */
  export type IResetRequest = {
    /**
     * Email address for password reset.
     *
     * System sends reset token to this email if account exists.
     */
    email: string & tags.Format<"email">;
  };

  /** Password reset request confirmation response. */
  export type IResetRequestResult = {
    /**
     * Confirmation message about password reset email.
     *
     * Always returns success message regardless of account existence for
     * security.
     */
    message: string;
  };

  /** Password reset completion data with token and new password. */
  export type IResetComplete = {
    /**
     * Reset token from email link.
     *
     * Validated against stored token hash.
     */
    reset_token: string;

    /** New password meeting security requirements. */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /**
     * Password confirmation.
     *
     * Must match new_password.
     */
    new_password_confirm: string;
  };

  /** Password reset completion confirmation. */
  export type IResetCompleteResult = {
    /**
     * Success confirmation message.
     *
     * Instructs user to log in with new password.
     */
    message: string;
  };

  /** Password change request with current password verification. */
  export type IChangePassword = {
    /**
     * Current password for verification.
     *
     * Prevents unauthorized password changes.
     */
    current_password: string;

    /** New password meeting security requirements. */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /** Password confirmation matching new_password. */
    new_password_confirm: string;
  };

  /** Password change confirmation response. */
  export type IChangePasswordResult = {
    /**
     * Success confirmation.
     *
     * Notifies about session revocation requiring re-login.
     */
    message: string;
  };
}
