import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneOwner {
  /**
   * Request body for refreshing owner authentication tokens using a refresh token.
   */
  export type IRefresh = {
    /**
     * Refresh token string for JWT token renewal.
     *
     * @x-autobe-specification JWT refresh token from IAuthorizationToken. Validates session renewal request and generates new access token.
     */
    refreshToken: string;
  };

  /**
   * Owner registration request containing email, password, username, and optional display name. Used for creating new owner accounts with the highest authority level in the Reddit-like community platform.
   */
  export type IJoin = {
    /**
     * Owner's email address used for authentication and account identification.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from owners.email. Unique constraint enforced. Used for authentication credentials.
     */
    email: string & tags.Format<"email">;

    /**
     * Owner's password for authentication. Must be at least 8 characters for security requirements.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain-text password input from user. Backend applies BCrypt hashing to produce password_hash stored in database. Never stored as plain text.
     */
    password: string & tags.MinLength<8>;

    /**
     * Unique username chosen by the owner for identification on the platform.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from owners.username. Unique constraint enforced across all actors. Display identifier for the owner.
     */
    username: string;

    /**
     * Optional display name for the owner. If not provided, defaults to the username value.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from owners.display_name. Optional field that defaults to username if not provided. Display name shown on the platform.
     */
    displayName?: string | null | undefined;
  };

  /**
   * Owner authentication response containing JWT tokens and owner identification for authenticated sessions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated owner.
     *
     * @x-autobe-specification Computed identity from JWT authentication claims. Extracted from the authenticated owner session.
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
   * Owner login request with email, password, and session context for JWT authentication.
   */
  export type ILogin = {
    /**
     * Owner email address for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from owners.email. Unique constraint.
     */
    email: string & tags.Format<"email">;

    /**
     * Current page URL (session context for self-authentication)
     *
     * @x-autobe-specification Session context: current page URL captured for self-authentication tracking. Not stored in database.
     */
    href: string & tags.Format<"uri">;

    /**
     * Client IP address (optional, SSR case)
     *
     * @x-autobe-specification Session context: client IP address captured optionally for SSR cases. Stored in session record, not in owners table.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * Plain text password (backend will hash using BCrypt)
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Plain text password that backend will hash using BCrypt before storing in owners.password_hash. Mapping to password_hash column.
     */
    password: string & tags.Format<"password">;

    /**
     * Previous page URL (session context for self-authentication)
     *
     * @x-autobe-specification Session context: previous page URL captured for self-authentication tracking. Not stored in database.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Lightweight owner profile containing essential identifying information for community ownership display.
   */
  export type ISummary = {
    /**
     * Unique identifier for the owner account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_owners.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Owner's unique username for display and identification.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_clone_owners.username. Unique username for identification.
     */
    username: string;

    /**
     * Owner's display name shown on the platform (nullable).
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_clone_owners.display_name. Optional display name field.
     */
    displayName?: string | null | undefined;

    /**
     * URL to owner's avatar image (nullable).
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_clone_owners.avatar_url. Optional avatar image URL.
     */
    avatarUrl?: string | null | undefined;
  };
}
