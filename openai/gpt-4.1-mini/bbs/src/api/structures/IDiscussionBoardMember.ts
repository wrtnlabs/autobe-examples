import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardMember {
  /**
   * Request body for member registration (join) operation.
   *
   * Includes essential fields required to create a new discussion board
   * member account.
   *
   * Fields include email, password (plain text for hashing at server), and
   * the display nickname.
   *
   * This DTO enforces uniqueness of the email and ensures secure password
   * hashing on the backend.
   *
   * On successful registration, returns IDiscussionBoardMember.IAuthorized
   * with JWT tokens and member details.
   */
  export type ICreate = {
    /**
     * Member's email address used as unique login identifier and for
     * communication. Must be unique across all members.
     */
    email: string & tags.Format<"email">;

    /**
     * Member's plain text password used for authentication creation and
     * must be securely hashed by the server prior to storage.
     */
    password: string;

    /**
     * Member's chosen display name used for identification within the
     * discussion board community.
     */
    nickname: string;
  };

  /**
   * Represents the authorized state of a discussion board member after
   * successful registration or login.
   *
   * Includes the member's unique identifier and the JWT token information
   * used for authenticated interactions with the API.
   *
   * This type helps clients handle authentication context and securely
   * communicate with protected endpoints.
   */
  export type IAuthorized = {
    /** Unique identifier of the authorized discussion board member. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request body schema for discussion board member login operation.
   *
   * Contains credentials and session context data required to authenticate a
   * member and establish a new session.
   *
   * Password is sent in plain text; it will be hashed server-side for
   * security. Session context fields capture connection metadata for audit
   * and security purposes.
   */
  export type ILogin = {
    /** Email address of the member used for authentication. */
    email: string & tags.Format<"email">;

    /** Plain text password of the member for login verification. */
    password: string;

    /**
     * Optional client IP address for session tracking. Server can extract
     * this if not provided, but client may include for SSR cases.
     */
    ip?: string | null | undefined;

    /** Connection URL (current page URL). Mandatory for session context. */
    href: string & tags.Format<"uri">;

    /** Referrer URL (previous page URL). Mandatory for session context. */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Summary representation of a registered member within the discussion board
   * system.
   *
   * Provides essential identification and profile information for listing and
   * embedding in other entities.
   *
   * Sensitive information such as passwords and tokens are excluded for
   * security.
   *
   * Used in lists and references across the discussion board API.
   */
  export type ISummary = {
    /** Unique identifier of the discussion board member. */
    id: string & tags.Format<"uuid">;

    /** Unique username of the member used for login and display. */
    username: string;

    /** Display name of the member shown publicly on the discussion board. */
    displayName: string;

    /** URL to the member's avatar image. May be null if no avatar is set. */
    avatarUrl?: (string & tags.Format<"uri">) | null | undefined;
  };
}
