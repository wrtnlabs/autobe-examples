import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityMember {
  /**
   * Request payload containing a valid refresh token to renew the access token. Used in POST /redditCommunity/auth/member/refresh to extend a member's session without requiring username/password. The refresh token is a long-lived JWT issued during login and must be valid and unrevoked. Authentication is entirely token-based for security. This object contains no user identifiers or personal data.
   */
  export type IRefresh = {
    /**
     * Long-lived JWT refresh token used to obtain a new access token without requiring user credentials. Must be provided to the /refresh endpoint to renew an expired session.
     *
     * @x-autobe-specification JWT refresh token string issued during authentication and stored in session store (redis or reddit_community_member_sessions) for validation and revocation. Must be present and not revoked for successful token renewal.
     */
    refreshToken: string;
  };

  /**
   * Request payload for member authentication. Contains the user's email address and plaintext password for login.
   */
  export type ILogin = {
    /**
     * The user's registered email address used for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Must be a valid, verified email address.
     */
    email: string & tags.Format<"email">;

    /**
     * The user's password in plaintext. Will be hashed and compared with the stored password_hash using bcrypt.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Direct mapping from reddit_community_members.password_hash. Provided in plaintext and validated server-side using bcrypt hashing.
     */
    password: string;
  };

  /**
   * Authentication response containing the member's unique identifier and secure session tokens for API access. The access token must be included in the Authorization header for protected requests. The refresh token allows obtaining new access tokens without re-authentication. This object contains no personal information such as email or display name, providing only the bare minimum needed for session maintenance. All tokens are short-lived JWTs with strict expiration policies to ensure security.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the authenticated member.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_members.id. UUID primary key.
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
   * Request body for registering a new member account. Provides the email address and password used for authentication. This is the initial step in user onboarding, after which profile details can be updated via separate API calls.
   */
  export type IJoin = {
    /**
     * User's email address for account registration and authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_members.email. Must be unique and valid email format.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password for account authentication. Will be hashed server-side before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Password is sent in plaintext and will be hashed by backend using bcrypt before storing in password_hash column. Must be at least 8 characters.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * A minimal public profile summary of a RedditCommunity member, intended for display in feeds, comments, audit logs, and moderation interfaces. Includes only non-sensitive identity information: display name, avatar URL, bio, and account creation date. Designed to protect user privacy while enabling clear identification in community interactions. Excludes direct contact information, authentication tokens, and system fields like update timestamps.
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
     * Public-facing username displayed on posts and profiles.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_community_members.display_name. Unique across platform.
     */
    display_name: string;

    /**
     * URL to the user's profile avatar image. Null if no avatar is set.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_community_members.avatar_url. May be null if no avatar is uploaded.
     */
    avatar_url?: string | null | undefined;

    /**
     * Optional self-description provided by the user. Null if not set.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from reddit_community_members.bio. May be null if no biography is provided.
     */
    bio?: string | null | undefined;

    /**
     * Timestamp when the user account was created, in UTC.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_members.created_at. UTC timestamp of account creation.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
