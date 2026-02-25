import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformModerator {
  /**
   * Request body schema for moderator login. Includes necessary credentials for authentication such as email and password.
   */
  export type ILogin = {
    /**
     * Moderator's email address used for authentication.
     *
     * @x-autobe-specification Moderator email address used for login authentication. Validated against unique email in moderators table.
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator's login password in plain text for authentication.
     *
     * @x-autobe-specification Plain-text password input used for login verification against stored password hash in the moderators table.
     */
    password: string;
  };

  /**
   * Response schema for an authenticated moderator session, providing the user's unique ID and a JWT-based authorization token pair with expiration info. Used in login, join, and refresh token API responses.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the moderator.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_moderators.id, providing unique moderator identifier.
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
   * Request payload for refreshing a moderator's JWT authorization token using a valid refresh token to maintain session continuity without login re-entry.
   */
  export type IRefresh = {
    /**
     * Refresh token string to validate and issue new JWT tokens.
     *
     * @x-autobe-specification The refreshToken property is a string representing the long-lived token submitted by the client for renewing JWT access tokens. It is validated against the authorization system to issue new tokens for continued moderator session.
     */
    refreshToken: string;
  };

  /**
   * Request payload for new moderator registration containing email, plaintext password, username, and optional profile fields like displayName, bio, and avatarUrl.
   */
  export type IJoin = {
    /**
     * Moderator's unique email address used for login authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_moderators.email column. Unique login identifier for moderator account.
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator's unique username chosen at registration.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from community_platform_moderators.username column. Unique username to identify moderator within the platform.
     */
    username: string;

    /**
     * Optional display name shown publicly for the moderator.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Optional display name associated with moderator profile, mapped to community_platform_moderators.display_name.
     */
    displayName?: string | null | undefined;

    /**
     * Short biography or profile description of the moderator.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Optional biography or profile description text mapped to community_platform_moderators.bio column.
     */
    bio?: string | null | undefined;

    /**
     * URL pointing to the moderator's profile avatar image.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Optional URL to moderator's avatar image stored in community_platform_moderators.avatar_url.
     */
    avatarUrl?: string | null | undefined;
  };

  /**
   * Detailed profile of a community platform moderator including identification, contact details, profile metadata, karma score, and timestamps. Password hash is excluded for security.
   */
  export type IModerator = {
    /**
     * Unique identifier for the moderator.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from community_platform_moderators.id, UUID string primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's unique email address used for login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from community_platform_moderators.email, unique and required for authentication.
     */
    email: string;

    /**
     * The unique username of the moderator.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from community_platform_moderators.username, unique username identifier.
     */
    username: string;

    /**
     * Public display name of the moderator.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from community_platform_moderators.display_name, nullable string for public display name.
     */
    displayName?: string | null | undefined;

    /**
     * Short biography of the moderator.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from community_platform_moderators.bio, nullable string containing profile biography.
     */
    bio?: string | null | undefined;

    /**
     * URL to the moderator's avatar image.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from community_platform_moderators.avatar_url, nullable string URL to avatar image.
     */
    avatarUrl?: string | null | undefined;

    /**
     * Reputation score reflecting the moderator's contributions.
     *
     * @x-autobe-database-schema-property karma
     * @x-autobe-specification Direct mapping from community_platform_moderators.karma, integer representing reputation score.
     */
    karma: number & tags.Type<"int32">;

    /**
     * Timestamp when the moderator record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from community_platform_moderators.created_at, timestamp with timezone.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the moderator record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from community_platform_moderators.updated_at, timestamp with timezone indicating last update.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp indicating when the moderator record was soft-deleted, or null if active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from community_platform_moderators.deleted_at, nullable timestamp with timezone used for soft-deletion.
     */
    deletedAt?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Public summary information of a community platform moderator user, including identification, username, display name, optional avatar URL, karma score, and lifecycle timestamps. Used in response DTOs to present moderator metadata safely.
   */
  export type ISummary = {};
}
