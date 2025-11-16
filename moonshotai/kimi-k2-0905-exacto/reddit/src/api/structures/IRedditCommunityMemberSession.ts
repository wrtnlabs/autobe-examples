import { tags } from "typia";

import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IRedditCommunityMemberSession {
  /**
   * Lightweight member session summary for audit tracking and security
   * monitoring throughout the Reddit Community platform.
   *
   * Contains essential session information for display in support contexts
   * and administrative interfaces. The summary format enables efficient
   * rendering of session data while preserving key metadata needed for
   * troubleshooting and security analysis. Linked to the corresponding member
   * account for complete audit trails.
   */
  export type ISummary = {
    /** Primary Key. Unique identifier for the member session. */
    id: string & tags.Format<"uuid">;

    /** IP address of the member session for security monitoring. */
    ip: string;

    /** Connection URL for the member session. */
    href: string & tags.Format<"uri">;

    /** Referrer URL for the member session. */
    referrer: string & tags.Format<"uri">;

    /**
     * Belonged member's identifier. Foreign key referencing
     * reddit_community_members.id for tracking and audit purposes.
     */
    reddit_community_member_id: string & tags.Format<"uuid">;

    /**
     * Belonged member's account summary. Links to the community member who
     * established this session for tracking and audit purposes.
     */
    reddit_community_member: IRedditCommunityMember.ISummary;

    /** Timestamp when the member session was created. */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the member session expires for lifecycle management
     * and security purposes (null if not expired yet, which is the common
     * case for active sessions).
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };

  /**
   * Member session creation data for tracking user sessions during
   * authentication and platform usage. Contains IP tracking, navigation URLs,
   * and optional expiration time for complete session management while
   * maintaining security audit trail compliance.
   */
  export type ICreate = {
    /**
     * IP address of the member session for security monitoring and access
     * tracking. Used for session validation and geographic access
     * analysis.
     */
    ip: string & tags.Format<"ipv4">;

    /**
     * Connection URL for the member session to track navigation patterns
     * and access sources. Records the current page location where the
     * session is active.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL for the member session to understand traffic sources and
     * user behavior. Tracks the previous page source that directed to the
     * current session.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * Optional timestamp when the session expires for lifecycle management.
     * Enables automatic session termination based on security policies or
     * user preferences.
     */
    expired_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
