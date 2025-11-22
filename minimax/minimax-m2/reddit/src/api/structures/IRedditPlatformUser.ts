import { tags } from "typia";

export namespace IRedditPlatformUser {
  /**
   * Lightweight user summary representation for platform interactions,
   * administrative oversight, and user attribution across all system
   * operations.
   *
   * Contains essential user identification and profile information required
   * for community interactions, content attribution, administrative
   * oversight, and platform engagement tracking. This summary format balances
   * comprehensive user context with performance optimization, providing
   * sufficient information for most user-facing operations while excluding
   * sensitive authentication data and large profile content.
   *
   * User summary includes core identification fields (username, email,
   * display name), profile enrichment data (avatar, bio, location, website),
   * security status information (email verification, account status),
   * reputation context (karma score), and activity tracking (last login).
   * This representation serves multiple purposes: content attribution in
   * posts and comments, administrative user management, community
   * participation tracking, and security monitoring.
   *
   * The summary format is optimized for inclusion in user-facing contexts
   * like post authors, comment attribution, community member lists, and
   * administrative dashboards. It provides essential context for platform
   * interactions while maintaining efficient data transmission and user
   * privacy protection.
   *
   * Used as the standard user representation across all platform operations
   * including post authorship, comment attribution, community membership
   * tracking, administrative oversight, and user engagement analytics. This
   * format ensures consistent user identification and context across all
   * platform features.
   */
  export type ISummary = {
    /**
     * Unique user identifier for platform identification and system
     * reference. Primary key used across all user-related operations and
     * foreign key relationships throughout the platform.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique username for platform identification and @mention
     * functionality. Must be unique across all users and is used for user
     * mentions, attribution, and community interactions.
     */
    username: string;

    /**
     * Email address for authentication, notifications, and account
     * communication. Must be unique and verified for full platform access.
     */
    email: string & tags.Format<"email">;

    /**
     * Public display name different from username for user recognition in
     * platform interactions. Optional field that allows users to present a
     * more recognizable identity than their username.
     */
    display_name?: string | undefined;

    /**
     * Profile picture URL for user identification in posts, comments, and
     * community interactions. Optional field that enhances user recognition
     * across the platform.
     */
    avatar_url?: (string & tags.Format<"uri">) | undefined;

    /**
     * Total karma points earned through quality contributions and community
     * engagement. Reputation metric used for user standing, community
     * privileges, and platform contribution tracking.
     */
    karma_score: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Account lifecycle status for user management and platform access
     * control. Determines user's current platform access level and
     * operational capabilities.
     */
    account_status: string;

    /**
     * Email verification status required for full platform access and
     * feature eligibility. Unverified accounts have restricted platform
     * access until email confirmation is completed.
     */
    email_verified?: boolean | undefined;

    /**
     * Last successful login timestamp for activity tracking and engagement
     * analytics. Used for user activity monitoring and platform engagement
     * analysis.
     */
    last_login?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Original account creation timestamp for reputation calculation and
     * user tenure analysis. Establishes user's platform membership duration
     * for community standing and trust metrics.
     */
    account_created: string & tags.Format<"date-time">;

    /**
     * Personal description and interests for community connection and
     * social features. Optional field that helps users express their
     * personality and connect with like-minded community members.
     */
    bio?: string | undefined;

    /**
     * Optional geographic location for community discovery and local
     * content relevance. Used for location-based community features and
     * local content recommendations.
     */
    location?: string | undefined;

    /**
     * Personal or professional website link for profile enrichment and
     * external verification. Optional field that can be used for profile
     * validation and professional networking.
     */
    website_url?: (string & tags.Format<"uri">) | undefined;
  };
}
