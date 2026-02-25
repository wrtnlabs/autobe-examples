import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IRedditCloneModerator {
  /**
   * Complete moderator entity with authentication tokens after successful login or registration. Includes all personal information, role details, and JWT authorization tokens.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the moderator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's primary email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.email. Unique constraint enforced.
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator's unique username for identification in the system.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.username. Unique display name.
     */
    username: string;

    /**
     * Optional display name shown in the UI. Falls back to username if not set.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.display_name. Nullable.
     */
    display_name?: string | null | undefined;

    /**
     * Optional biographical text about the moderator.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.bio. Nullable text field.
     */
    bio?: string | null | undefined;

    /**
     * URL to the moderator's avatar image. Nullable for users without uploaded avatars.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.avatar_url. Nullable URI field.
     */
    avatar_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Moderator's role classification (e.g., 'moderator', 'owner').
     *
     * @x-autobe-database-schema-property role_type
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.role_type. Classification field.
     */
    role_type: string;

    /**
     * Bitmask or numeric representation of moderator permissions for access control.
     *
     * @x-autobe-database-schema-property permissions
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.permissions. Bitmask or numeric representation.
     */
    permissions: number & tags.Type<"int32">;

    /**
     * Timestamp when the moderator account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.created_at. Timestamp with timestamptz.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Short-lived JWT access token for authenticating API requests. Expires after 15 minutes.
     *
     * @x-autobe-specification Generated JWT access token with 15 minutes expiration. Created during authentication flow and included in response.
     */
    access_token: string;

    /**
     * Long-lived JWT refresh token for obtaining new access tokens without re-authentication. Expires after 7 days.
     *
     * @x-autobe-specification Generated JWT refresh token with 7 days expiration. Stored securely in database-backed storage and used to obtain new access tokens.
     */
    refresh_token: string;

    /**
     * Access token expiration time in seconds (15 minutes).
     *
     * @x-autobe-specification Computed: 900 seconds (15 minutes) representing access token expiration duration.
     */
    token_expires_in: number & tags.Type<"int32">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for moderator token refresh operation containing refresh token and session metadata for authentication renewal.
   */
  export type IRefresh = {
    /**
     * Valid refresh token obtained during login or previous refresh operation.
     *
     * @x-autobe-specification Extracted from JWT refresh token stored in reddit_clone_moderator_sessions table. Validated against database-backed storage with revocation checks and expiration verification.
     */
    refreshToken: string;

    /**
     * Device information for session tracking including device name, fingerprint, and IP address.
     *
     * @x-autobe-specification Computed from HTTP request headers: deviceName from User-Agent, deviceFingerprint from combined headers, ipAddress from request source IP for session tracking and security purposes.
     */
    deviceInfo?:
      | {
          /**
           * Name of the device requesting refresh
           */
          deviceName?: string | undefined;

          /**
           * Unique device identifier for security tracking
           */
          deviceFingerprint?: string | undefined;

          /**
           * Client IP address for session tracking
           */
          ipAddress?: (string & tags.Format<"ipv4">) | undefined;
        }
      | undefined;
  };

  /**
   * Login request containing email and password for moderator authentication.
   */
  export type ILogin = {
    /**
     * Moderator's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.email. Used for authentication lookup.
     */
    email: string & tags.Format<"email">;

    /**
     * Moderator's password for authentication (plaintext input that backend hashes).
     *
     * @x-autobe-specification Backend hashes this plaintext password and compares with reddit_clone_moderators.password_hash. User provides plaintext password, backend handles hashing.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for moderator account registration. Contains authentication credentials and basic profile information needed to create a new moderator account.
   */
  export type IJoin = {
    /**
     * Unique email address for authentication. Must be valid email format and unique across the system.
     *
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;

    /**
     * Password for authentication. Minimum 8 characters required for security.
     */
    password: string & tags.MinLength<8>;

    /**
     * Unique username for the moderator. Must be alphanumeric with underscore only, unique across the system.
     *
     * @x-autobe-database-schema-property username
     */
    username: string & tags.Pattern<"^[a-zA-Z0-9_]+$">;

    /**
     * Optional display name shown in the UI. If not provided, username will be used as display name.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Optional display name that maps to display_name column. If not provided, backend defaults to username.
     */
    displayName?: string | null | undefined;
  };

  /**
   * Moderation analytics dashboard summary including daily active moderators, moderation statistics, bans, and report metrics. This provides community moderators with insights into their moderation impact, community health trends, and areas requiring attention.
   */
  export type IAnalytic = {
    /**
     * Number of unique moderators who performed moderation actions today
     *
     * @x-autobe-specification COUNT(DISTINCT moderator_id) from moderation_logs with today's date filter (created_at >= CURRENT_DATE).
     */
    dailyActiveModerators: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of posts deleted by moderators today
     *
     * @x-autobe-specification COUNT(*) from moderation_logs where target_type = 'post' and created_at >= CURRENT_DATE.
     */
    postsModerated: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of comments deleted by moderators today
     *
     * @x-autobe-specification COUNT(*) from moderation_logs where target_type = 'comment' and created_at >= CURRENT_DATE.
     */
    commentsModerated: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of new user bans issued today
     *
     * @x-autobe-specification COUNT(*) from ban_records where status = 'active' and created_at >= CURRENT_DATE.
     */
    bansIssued: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of user bans lifted today
     *
     * @x-autobe-specification COUNT(*) from ban_records where status = 'lifted' and updated_at >= CURRENT_DATE.
     */
    bansLifted: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of content reports awaiting moderator review
     *
     * @x-autobe-specification COUNT(*) from content_reports where status = 'pending'.
     */
    pendingReports: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of reports resolved by moderators today
     *
     * @x-autobe-specification COUNT(*) from content_reports where status IN ('approved', 'dismissed').
     */
    resolvedReports: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Percentage of resolved reports that were approved (deletion) vs dismissed
     *
     * @x-autobe-specification COUNT(*) of approved reports / COUNT(*) of resolved reports * 100. Resolved reports = approved + dismissed.
     */
    approvalRate: number & tags.Minimum<0> & tags.Maximum<100>;
  };

  /**
   * Summary view of a moderator with essential profile information for display in ban records, moderation logs, and appeal contexts. Contains only required and essential display fields.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderator account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Moderator's email address for authentication purposes.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.email. Unique email address for authentication.
     */
    email: string;

    /**
     * Moderator's unique username for identification.
     *
     * @x-autobe-database-schema-property username
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.username. Unique display name.
     */
    username: string;

    /**
     * Moderator's display name shown in the user interface.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.display_name. Optional display name shown in UI.
     */
    displayName?: string | null | undefined;

    /**
     * Moderator's biographical text or self-description.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.bio. Optional biographical text.
     */
    bio?: string | null | undefined;

    /**
     * URL to the moderator's avatar image.
     *
     * @x-autobe-database-schema-property avatar_url
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.avatar_url. URL to moderator's avatar image.
     */
    avatarUrl?: string | null | undefined;

    /**
     * Moderator's role type classification (e.g., 'moderator', 'owner').
     *
     * @x-autobe-database-schema-property role_type
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.role_type. Moderator role classification.
     */
    roleType: string;

    /**
     * Numeric representation of moderator permissions.
     *
     * @x-autobe-database-schema-property permissions
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.permissions. Bitmask or numeric representation of moderator permissions.
     */
    permissions: number & tags.Type<"int32">;

    /**
     * Timestamp when the moderator account was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.created_at. Timestamp when moderator account was created.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the moderator account was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.updated_at. Timestamp when moderator account was last updated.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Optional timestamp when the moderator account was deleted (soft delete).
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.deleted_at. Optional timestamp for soft delete.
     */
    deletedAt?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Timestamp of the moderator's last login.
     *
     * @x-autobe-database-schema-property last_login_at
     * @x-autobe-specification Direct mapping from reddit_clone_moderators.last_login_at. Timestamp of moderator's last login.
     */
    lastLoginAt?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
