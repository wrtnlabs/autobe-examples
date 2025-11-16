import { tags } from "typia";

export namespace IRedditCommunityMemberSessions {
  /**
   * Concise summary representation of member session records optimized for
   * audit tracking and cross-reference contexts throughout the Reddit
   * Community platform.
   *
   * This session summary provides essential authentication context required
   * for comprehensive audit trails without exposing sensitive session
   * internals or authentication credentials. It maintains the core session
   * attributes needed for security monitoring, access tracking, and
   * chronological correlation while optimizing for efficient API responses.
   *
   * The session context is critical for compliance requirements, security
   * analysis, and incident investigation. It enables correlation between user
   * actions, authentication events, and platform access patterns while
   * maintaining privacy boundaries and audit trail integrity.
   *
   * By providing a minimal yet complete session representation, this type
   * supports the platform's compliance and security requirements while
   * enabling efficient cross-referencing across authentication events,
   * content creation, and system access patterns throughout the API
   * ecosystem.
   */
  export type ISummary = {
    /**
     * Primary Key. Unique identifier for the member session used for audit
     * tracking and security monitoring.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the member session was created for chronological
     * tracking and session lifecycle management.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the member session expires for lifecycle management
     * and security access control.
     */
    expired_at: string & tags.Format<"date-time">;

    /**
     * IP address of the member session for security monitoring and access
     * tracking in audit records.
     */
    ip?: string | undefined;

    /**
     * Connection URL for the member session to track navigation patterns
     * and access sources for security audit trails.
     */
    href?: string | undefined;

    /**
     * Referrer URL for the member session to understand traffic sources and
     * user behavior patterns.
     */
    referrer?: string | undefined;
  };
}
