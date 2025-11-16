import { tags } from "typia";

export namespace IUserProfile {
  /**
   * Lightweight user profile summary optimized for administrative interfaces
   * and list views within Reddit Community platform governance systems.
   *
   * Efficient summary representation excludes sensitive data while providing
   * essential user information for dashboards, member management, and
   * administrative workflows. Designed for high-performance API responses
   * with minimal payload overhead while maintaining critical context for
   * platform moderators and administrators.
   *
   * Related operations include full user profile access via UserProfile
   * entity for comprehensive account management, administrative overrides for
   * policy violations, and integration with community governance tools for
   * effective platform oversight throughout distributed system
   * architectures.
   */
  export type ISummary = {
    /**
     * Unique identifier for user profile with UUID format validation.
     * Primary key used across Reddit Community platform architecture for
     * consistent identification and efficient database indexing throughout
     * distributed service cluster environments.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Public display username for community identification and profile
     * personalization throughout Reddit Community platform interactions.
     * Regulated through automated content filtering and manual review for
     * appropriate community standards compliance.
     */
    username: string & tags.MinLength<3> & tags.MaxLength<50>;

    /**
     * Profile avatar URL providing visual identity for user recognition
     * throughout Reddit Community platform social interactions.
     * Automatically generated if not provided through preference management
     * system and content policy enforcement mechanisms.
     */
    avatar_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Accumulated karma points reflecting user engagement quality across
     * all Reddit community interactions through post contributions and
     * comment discussions. Designed as comprehensive reputation system
     * encouraging valuable community participation while preventing gaming
     * through sophisticated anti-spam algorithms.
     */
    karma_score: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Account verification status indicating email address confirmation and
     * authenticity validation process completion within Reddit Community
     * platform authentication system. Verification requirements include
     * validation confirmation and consent acknowledgment protocols for
     * platform governance compliance.
     */
    is_verified: boolean;

    /**
     * ISO 8601 timestamp recording user profile creation within Reddit
     * Community platform ecosystem. Used for member lifecycle tracking
     * account aging analytics and platform growth metrics calculation
     * throughout administrative oversight systems and operational
     * excellence frameworks.
     */
    join_date: string & tags.Format<"date-time">;

    /**
     * Count of active communities where user participates as member
     * moderator or subscriber for engagement analytics and platform
     * insights. Metric supports dashboard visualization administrative
     * reporting and resource allocation across distributed Reddit Community
     * platform infrastructure and service orchestration pipelines.
     */
    community_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Most recent activity timestamp enabling chronological sorting and
     * activity-based filtering throughout Reddit Community platform
     * administrative dashboards. Activity encompasses posts comments votes
     * moderation actions and profile updates across distributed service
     * cluster environments for comprehensive user engagement analysis.
     */
    last_activity: (string & tags.Format<"date-time">) | null;
  };
}
