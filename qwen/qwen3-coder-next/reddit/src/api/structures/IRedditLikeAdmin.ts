import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeAdmin {
  /**
   * Login request containing admin email and password for authentication.
   */
  export type ILogin = {
    email: string & tags.Format<"email">;
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for admin token refresh operation containing the refresh token to obtain a new access token.
   */
  export type IRefresh = {
    /**
     * Refresh token obtained during login. Used to obtain new access token without re-authenticating credentials. Server validates session existence and token integrity.
     *
     * @x-autobe-specification Refresh token from reddit_like_admin_sessions table. Validates session integrity, checks expiration, generates new access token with updated expiration.
     */
    refresh: string & tags.Format<"password">;
  };

  /**
   * Request body for registering a new admin account. Contains required email, password, username, and display name fields. Optional bio and avatar URL can be provided.
   */
  export type IJoin = {
    /**
     * Admin's email address for authentication. Must be unique across all admin accounts.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_like_admins.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for authentication. Will be securely hashed by the backend before storage.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Accepts plain text password from user, backend securely hashes before storing to reddit_like_admins.password_hash. Never stores plain text.
     */
    password: string & tags.Format<"password">;

    /**
     * Unique username for admin identification on the platform.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_like_admins.username. Unique constraint enforced.
     */
    username: string;

    /**
     * Display name shown on the admin's profile and content.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_like_admins.display_name. Field name transformation: camelCase to snake_case.
     */
    displayName: string;

    /**
     * Optional biography text for the admin profile.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from reddit_like_admins.bio. Nullable field allowing empty biography.
     */
    bio?: string | null | undefined;

    /**
     * Optional URL for the admin's avatar image.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_like_admins.avatar_url. Nullable URL field for avatar image. Field name transformation: camelCase to snake_case.
     */
    avatarUrl?: (string & tags.Format<"uri">) | null | undefined;
  };

  /**
   * Admin account profile with ID and authorization tokens for authenticated API access.
   */
  export type IAuthorized = {
    /**
     * Unique admin account identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_admins.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
