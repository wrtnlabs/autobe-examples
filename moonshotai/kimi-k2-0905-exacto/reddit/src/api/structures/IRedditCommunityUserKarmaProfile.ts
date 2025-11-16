import { tags } from "typia";

export namespace IRedditCommunityUserKarmaProfile {
  /**
   * Concise representation of member karma profiles displaying essential
   * reputation metrics for authentication responses and community
   * participation validation without detailed statistical breakdowns.
   *
   * Provides karma summary for:
   *
   * - Authentication response optimization
   * - Community engagement validation
   * - Member status indication
   * - Karma-based privilege assessment
   * - Reputation overview in profile contexts
   *
   * Maintains API response efficiency by aggregating complex karma
   * calculation data into core reputation metrics while preserving the
   * essential karma scores needed for community participation and platform
   * feature access based on user reputation and contribution quality
   * assessments.
   */
  export type ISummary = {
    /**
     * Karma calculation identifier. Provides unique reference for this
     * specific karma summary instance.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Associated member account identifier establishing the bidirectional
     * relationship between karma scores and member identity.
     */
    member_id: string & tags.Format<"uuid">;

    /**
     * Karma points earned from post votes. Represents content creation
     * reputation across all Reddit community participation.
     */
    post_karma: number & tags.Type<"int32">;

    /**
     * Karma points earned from comment votes accumulated through discussion
     * engagement across platform communities.
     */
    comment_karma: number & tags.Type<"int32">;

    /**
     * Combined total of post karma and comment karma providing the primary
     * reputation metric visible throughout communities.
     */
    total_karma: number & tags.Type<"int32">;

    /**
     * Karma record creation timestamp representing the establishment of
     * karma tracking for this member account.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last karma calculation update timestamp indicating when community
     * voting most recently modified member reputation scores.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
