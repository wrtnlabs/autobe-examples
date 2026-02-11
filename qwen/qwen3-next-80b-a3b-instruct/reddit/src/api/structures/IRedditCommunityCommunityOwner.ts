import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCommunityCommunityOwner {
  /**
   * Credentials used to authenticate a community owner. Contains the owner's registered email address and plaintext password. The system validates these against the database to establish a secure session.
   */
  export type ILogin = {
    /**
     * The registered email address of the community owner, used to locate their account during login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.email. Must be a unique, lowercased email address used for authentication.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password provided by the user during login. Must match the hashed value stored in the database.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Client submits plaintext password; server compares it against password_hash using bcrypt.compare. Never stored, never returned. Must not be hashed by client.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * This is an empty request object type used in the refresh token endpoint to indicate that no request body is provided. The refresh token is securely transmitted via an HTTP-only cookie, eliminating the need for any fields in the request body. Using this empty schema ensures type safety and explicitly documents that no user-provided data is expected in the request payload.
   */
  export type IRefresh = {};

  /**
   * Request payload for registering a new community owner account. Includes required email and password credentials for authentication. The display_name is optional and defaults to the prefix of the email address (before @) if not provided. This is the first step in the authentication flow — account creation is not complete until email verification is completed.
   */
  export type IJoin = {
    /**
     * The registered email address used for account identification, login, and verification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.email. Must be unique and validated against existing accounts. Accepts standard email format.
     */
    email: string & tags.Format<"email">;

    /**
     * The plain-text password provided during registration. It will be hashed server-side before storage and is never persisted in cleartext.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Client sends plain-text password. Server hashes using bcrypt with cost factor 12 and stores result in reddit_community_community_owners.password_hash. No plaintext passwords are stored.
     */
    password: string & tags.Format<"password">;

    /**
     * User-selected public display name shown on profiles and posts. Defaults to the part of the email before '@' if not provided explicitly.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Optional field. If omitted, server assigns display_name as substring before '@' in email (e.g., user@domain.com → 'user'). Stored directly in reddit_community_community_owners.display_name.
     */
    display_name?: string | undefined;
  };

  /**
   * Authentication response containing session tokens for authenticated community owners. This object is returned after successful login or token refresh, and includes the short-lived access token (for API authorization) and the long-lived refresh token (for obtaining new access tokens). This is the standard token container for all community owner authentication flows.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Lightweight summary of a community owner for display in moderation interfaces, community listings, and audit trails. Contains only the public information needed to identify the owner: their display name, optional bio, and avatar image. Excludes sensitive authentication data like email or password_hash.
   */
  export type ISummary = {
    /**
     * Unique identifier of the community owner.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display name shown in feeds, comments, and moderation interfaces.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.display_name. User-selected public name.
     */
    display_name: string;

    /**
     * Optional short biography or description of the community owner.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.bio. Optional user-provided biography.
     */
    bio?: string | null | undefined;

    /**
     * URL to the owner's profile avatar image. May be null if not set.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_community_community_owners.avatar_url. URL to user's profile avatar image.
     */
    avatar_url?: string | null | undefined;
  };
}
