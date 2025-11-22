import { tags } from "typia";

export namespace IRedditPlatformCommunityModeratorSession {
  /**
   * Summary representation of community moderator sessions for references and
   * lightweight displays.
   *
   * Provides essential session information including moderator
   * identification, session lifecycle, connection context, and parent
   * moderation action context. Excludes sensitive authentication details and
   * comprehensive activity logs for privacy and performance.
   *
   * Used in moderation action references to identify which moderator
   * performed specific actions while maintaining appropriate privacy
   * boundaries. Includes connection context (IP address, access URL,
   * referrer) for audit trails and accountability purposes without exposing
   * sensitive authentication information.
   *
   * This summary variant is optimized for session management and audit trail
   * purposes while maintaining appropriate privacy boundaries. Sessions are
   * subsidiary entities managed through identity flows and support audit
   * tracing of moderation activities and administrative access.
   */
  export type ISummary = {
    /**
     * Unique identifier of the moderator session. Primary key for session
     * tracking and audit purposes.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to authenticated community moderator for session ownership
     * and moderation activity tracking. Links to
     * reddit_platform_communitymoderators table.
     */
    reddit_platform_communitymoderator_id: string & tags.Format<"uuid">;

    /**
     * Moderator's IP address for enhanced security monitoring and access
     * control. Used for tracking and identifying session origin.
     */
    ip: string;

    /**
     * Connection URL showing moderator access point for security analytics
     * and monitoring. Indicates the URL from which the moderator accessed
     * the system.
     */
    href: string;

    /**
     * Referrer URL indicating how moderator accessed administrative
     * interface for security tracking and access pattern analysis.
     */
    referrer: string;

    /**
     * Session creation timestamp for audit trails and moderator activity
     * monitoring. Tracks when the moderator session was established.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Session expiration timestamp for automatic logout and enhanced
     * security management. Null if session is still active.
     */
    expired_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
