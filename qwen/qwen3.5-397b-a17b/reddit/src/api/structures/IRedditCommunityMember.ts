import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityMember {
  /**
   * Request body for authenticating a member using email address and password credentials. The email must match an existing member account that is not soft-deleted, and the password must match the stored password hash.
   */
  export type ILogin = {
    /**
     * User's email address for authentication. Must match an existing member account.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Used as unique login identifier. Backend validates email exists in database, account is not soft-deleted (deleted_at is null), and format is valid email.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for authentication. Must match the stored password hash for the given email.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password input from user. Backend compares against reddit_community_members.password_hash using secure bcrypt or argon2 hash comparison. Password is never stored in plain text.
     */
    password: string;
  };

  /**
   * Request body for refreshing authentication tokens. Contains the refresh token that validates the member's session and enables generation of new access tokens.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for obtaining new access tokens. Must match a valid, non-expired session in the system.
     *
     * @x-autobe-database-schema-property refresh_token
     * @x-autobe-specification Direct mapping from reddit_community_member_sessions.refresh_token. Backend validates token exists, checks expired_at timestamp, verifies associated member is not soft-deleted in reddit_community_members. Used to generate new access_token and optionally new refresh_token.
     */
    refresh_token: string;
  };

  /**
   * Request body for member account registration. Contains email for login, plain-text password (will be hashed), unique username for public display, and session context (href, referrer, ip) for security tracking and audit purposes.
   */
  export type IJoin = {
    /**
     * Email address for account login and communication. Must be unique and properly formatted.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Must be unique across all members. Validated for proper email format. Used as primary login identifier.
     */
    email: string & tags.Format<"email">;

    /**
     * Account password for authentication. Will be securely hashed before storage. Must meet security requirements.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain-text password provided by user. Backend applies bcrypt or argon2 hashing before storing in password_hash column. Must meet minimum strength requirements (length, complexity).
     */
    password: string;

    /**
     * Unique username for public display and mentions. Must be unique across the platform.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_community_members.username. Must be unique across all members. User-chosen identifier for public display and @mentions.
     */
    username: string;

    /**
     * URL of the page where the user initiated registration. Used for session tracking and security purposes.
     *
     * @x-autobe-specification Current page URL where registration was initiated. Captured for session tracking and security audit. Stored in reddit_community_member_sessions table, not in members table. Format: valid URI.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referring URL that brought the user to the registration page. Used for analytics and security tracking.
     *
     * @x-autobe-specification HTTP referrer header from registration request. Indicates where the user came from before landing on registration page. Stored in reddit_community_member_sessions table. Format: valid URI.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Client IP address for security tracking and fraud prevention. Captured during session creation.
     *
     * @x-autobe-specification Client IP address captured from request or server-side fallback. Stored in reddit_community_member_sessions table for security audit and fraud detection. Format: IPv4. Optional in request body as server can capture it.
     */
    ip?: (string & tags.Format<"ipv4">) | undefined;
  };

  /**
   * Authentication response containing the member's unique identifier and JWT tokens for session management. Returned after successful registration, login, or token refresh operations.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated member.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_members.id. UUID format generated by database.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Lightweight member summary for list displays and references. Includes the member's unique identifier, public username, and account creation timestamp. Used throughout the API to represent member identity in contexts such as post authors, comment authors, community owners, moderators, ban records, and vote references.
   */
  export type ISummary = {
    /**
     * Unique identifier for the member account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_members.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique username chosen by the member for public display and mentions across the platform.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_community_members.username. Unique constraint enforced at database level.
     */
    username: string;

    /**
     * Timestamp when the member account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_members.created_at. Timestamp with timezone.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
