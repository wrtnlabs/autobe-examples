import { tags } from "typia";

export namespace IRedditPlatformGuestSession {
  /**
   * Lightweight guest session summary containing essential tracking information for display in lists and feeds. Includes session identifier, associated guest reference, connection metadata (IP, referrer, current page), and session lifecycle timestamps.
   */
  export type ISummary = {
    /**
     * Unique session identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from sessions.id. UUID primary key identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Associated guest account identifier.
     *
     * @x-autobe-database-schema-property reddit_platform_guest_id
     * @x-autobe-specification Direct mapping from sessions.reddit_platform_guest_id. UUID foreign key referencing the guest who owns this session.
     */
    reddit_platform_guest_id: string & tags.Format<"uuid">;

    /**
     * Current page URL/href when session is active.
     *
     * @x-autobe-database-schema-property href
     * @x-autobe-specification Direct mapping from sessions.href. Current page URL when session is active.
     */
    href: string & tags.Format<"uri">;

    /**
     * Browser referrer URL when session was created.
     *
     * @x-autobe-database-schema-property referrer
     * @x-autobe-specification Direct mapping from sessions.referrer. Browser referrer URL when session was created (nullable).
     */
    referrer: (string & tags.Format<"uri">) | null;

    /**
     * IP address of the guest's device.
     *
     * @x-autobe-database-schema-property ip
     * @x-autobe-specification Direct mapping from sessions.ip. IP address of the guest's device.
     */
    ip: string;

    /**
     * Session creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from sessions.created_at. Timestamp when the guest session was created.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp when the session becomes invalid.
     *
     * @x-autobe-database-schema-property expired_at
     * @x-autobe-specification Direct mapping from sessions.expired_at. Timestamp when the guest session expires and becomes invalid.
     */
    expired_at: string & tags.Format<"date-time">;
  };
}
