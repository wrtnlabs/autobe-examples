import { tags } from "typia";

import { IRedditPlatformAdmin } from "./IRedditPlatformAdmin";

export namespace IRedditPlatformAdminSession {
  /**
   * Detailed information about a member's session including connection metadata and lifecycle timestamps. This DTO provides session ownership verification data (IP address, referrer, current page) and temporal boundaries (creation and expiration times) for session management operations. Sensitive authentication tokens are excluded for security.
   */
  export type IDetail = {
    /**
     * Unique identifier of the session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member who owns this session.
     *
     * @x-autobe-database-schema-property member_id
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.member_id. UUID reference to the member who owns this session.
     */
    member_id: string & tags.Format<"uuid">;

    /**
     * Client IP address used to establish the session connection.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.ip. IPv4 address of the client that created this session.
     */
    ip: string;

    /**
     * The last page URL visited during this session. May be null if not set.
     *
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.href. Nullable URI of the last page visited during this session.
     * @x-autobe-database-schema-property href
     */
    href: (string & tags.Format<"uri">) | null;

    /**
     * The incoming referrer URL that triggered session creation. May be null if not set.
     *
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.referrer. Nullable URI that brought the member to the platform.
     * @x-autobe-database-schema-property referrer
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * Timestamp when this session was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.created_at. Timestamp when the session was initiated (login time).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this session expires.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_platform_member_sessions.expired_at. Timestamp when this session tokens become invalid.
     */
    expired_at: string & tags.Format<"date-time">;
  };

  /**
   * Lightweight session summary for display in audit logs and admin dashboards. Contains essential identification and status fields including session identifier, client IP address, creation and expiration timestamps, and the associated administrator reference. Used for session tracking and security audit without exposing sensitive authentication tokens.
   */
  export type ISummary = {
    /**
     * Unique identifier for the session.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_platform_admin_sessions.id (UUID primary key). Used as unique session identifier for tracking and lookup.
     */
    id: string & tags.Format<"uuid">;

    /**
     * IP address of the client that initiated the session connection.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from reddit_platform_admin_sessions.ip (client IP address string). Used for security tracking, abuse detection, and geographic analysis.
     */
    ip: string;

    /**
     * Timestamp when the session was created (login time).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_platform_admin_sessions.created_at (timestamptz). Represents the login time when the session was created and JWT tokens were issued.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the session tokens expire.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from reddit_platform_admin_sessions.expired_at (timestamptz). Token expiration timestamp for security requirement - always set, indicates when access and refresh tokens become invalid.
     */
    expiredAt: string & tags.Format<"date-time">;

    /**
     * Administrator who owns this session.
     *
     * @x-autobe-database-schema-property admin
     * @x-autobe-specification FK transformation from reddit_platform_admin_sessions.admin_id (UUID FK) to admin relation object. Join via admin_id to reddit_platform_admins.id. Returns IRedditPlatformAdmin.ISummary (lightweight admin profile).
     */
    admin: IRedditPlatformAdmin.ISummary;
  };
}
