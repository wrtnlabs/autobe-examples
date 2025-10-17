import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardModerator {
  /**
   * Moderator registration information for account creation.
   *
   * Requires appointing administrator reference and standard account
   * credentials.
   */
  export type ICreate = {
    /**
     * Administrator who appointed this moderator.
     *
     * References discussion_board_administrators.id.
     */
    appointed_by_admin_id: string & tags.Format<"uuid">;

    /**
     * Unique username for moderator account.
     *
     * 3-30 characters, alphanumeric with hyphens and underscores.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">;

    /**
     * Email address for moderator authentication.
     *
     * Must be unique and will require verification.
     */
    email: string & tags.Format<"email">;

    /**
     * Password in plain text.
     *
     * Backend hashes before storage using bcrypt cost factor 12.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<128>;
  };

  /**
   * Authorization response for moderator authentication.
   *
   * Returned after successful login, registration, or token refresh.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated moderator. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /** Login credentials for moderator authentication. */
  export type ILogin = {
    /** Email address or username for login. */
    email: string;

    /** Password for authentication. */
    password: string;
  };

  /** Refresh token request for moderator access renewal. */
  export type IRefresh = {
    /** Current valid refresh token. */
    refresh_token: string;
  };
}
