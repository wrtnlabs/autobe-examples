import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditLikeModerator {
  /**
   * Request body for refreshing authentication tokens. Contains only the refresh token needed to obtain new access tokens.
   */
  export type IRefresh = {
    /**
     * The refresh token received from a previous authentication session. Used to obtain new access tokens without requiring re-authentication.
     *
     * @x-autobe-specification Refresh token string from the stored session in reddit_like_moderator_sessions table. Used to validate session and obtain new access token.
     */
    refreshToken: string;
  };

  /**
   * Moderator authentication request with email and password credentials.
   */
  export type ILogin = {
    /**
     * Registered email address associated with the moderator account.
     *
     * @x-autobe-specification Moderator email address for authentication. Must match a registered moderator account.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password that will be verified against the bcrypt hash.
     *
     * @x-autobe-specification Plaintext password for credential verification against bcrypt-hashed password.
     */
    password: string;
  };

  /**
   * Moderator account profile and authentication tokens for authorized responses.
   */
  export type IAuthorized = {
    /**
     * Unique moderator identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_like_moderators.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's email address.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_like_moderators.email.
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator's display name shown in UI.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_like_moderators.display_name.
     */
    display_name: string & tags.MaxLength<100>;

    /**
     * Moderator's karma score from community contributions.
     *
     * @x-autobe-database-schema-property karma_score
     * @x-autobe-specification Direct mapping from reddit_like_moderators.karma_score.
     */
    karma_score: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for creating a new moderator account.
   */
  export type IJoin = {
    /**
     * Unique email address for authentication and communication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_like_moderators.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Secure password (will be hashed with bcrypt).
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Password transformed to password_hash using bcrypt hashing before database storage.
     */
    password: string & tags.Format<"password">;

    /**
     * Unique username for moderator profile and mentions.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_like_moderators.username. Unique constraint enforced.
     */
    username: string;

    /**
     * Display name shown in UI.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_like_moderators.display_name.
     */
    display_name: string;
  };
}
