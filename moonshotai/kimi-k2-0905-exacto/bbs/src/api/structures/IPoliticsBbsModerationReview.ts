import { tags } from "typia";

export namespace IPoliticsBbsModerationReview {
  /**
   * Summary information for a politics discussion board content moderation
   * review. This DTO contains essential details for the moderation workflow
   * including review status, reason codes, and basic information about the
   * reviewed content and moderator.
   *
   * The scope in accordance to the moderation review workflow is specifically
   * for article SNAPSHOTS which captures the point-in-time state of articles
   * when they were submitted for review. This enables moderators to review
   * the exact version that was flagged or submitted, even if the article has
   * been modified since.
   *
   * The summary excludes detailed content data and focuses on review
   * metadata, making it suitable for list views and moderation queue displays
   * where quick decision-making is required.
   */
  export type ISummary = {
    /**
     * Unique identifier for the moderation review record. Used for audit
     * trails and review process tracking.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the article snapshot being reviewed. Links to the
     * specific point-in-time version of the article when the review was
     * initiated.
     */
    politics_bbs_article_snapshot_id: string &
      tags.Format<"uuid"> &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-field": "politics_bbs_article_snapshots.id";
      }>;

    /**
     * The moderator who performed this review. Links to the moderator
     * responsible for the approval/rejection decision.
     */
    politics_bbs_moderator_id: string &
      tags.Format<"uuid"> &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-field": "politics_bbs_moderators.id";
      }>;

    /**
     * Snapshot title at the time of review. Captures the exact article
     * title being reviewed for quick identification.
     */
    title: string &
      tags.JsonSchemaPlugin<{
        "x-autobe-prisma-field": "politics_bbs_article_snapshots.title";
      }>;

    /**
     * Standardized reason code for the moderation action. Enables
     * consistent reporting and audit trail tracking across all reviews.
     */
    reason_code: string & tags.Pattern<"^[A-Z_]+[0-9]*$">;

    /**
     * Detailed explanation or notes from the moderator about the review
     * decision. Provides context for the moderation action and can be used
     * for communication with content creators.
     */
    reason_detail?:
      | (string & tags.MinLength<10> & tags.MaxLength<500>)
      | undefined;

    /**
     * Current status of the review process: pending, approved, rejected, or
     * appealed. Indicates where the content stands in the moderation
     * workflow.
     */
    status: "pending" | "approved" | "rejected" | "appealed" | "dismissed";

    /**
     * Status of the content before this review action. Enables tracking of
     * review progression and provides historical context for audit
     * purposes.
     */
    previous_status?: string | null | undefined;

    /**
     * Timestamp when this review record was created. Used for audit trails
     * and chronological ordering of moderation workflow.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this review record was last modified. Essential for
     * tracking review progression and response time analysis.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Request parameters for the content moderation review queue on the
   * politicsBBS discussion board. This DTO enables moderators to efficiently
   * filter and sort content requiring review by type, state, category, date
   * range, and content search to maintain quality standards in economic and
   * political discussions.
   *
   * The moderation review system supports the complete editorial workflow by
   * allowing moderators to focus their attention on specific content areas,
   * time periods, or policy violations. This comprehensive filtering approach
   * ensures that inappropriate content is caught while legitimate political
   * and economic discourse is approved efficiently.
   *
   * This request structure integrates with the politics_bbs_content_reviews
   * table to provide sophisticated queue management capabilities. The
   * pagination parameters (page, limit) ensure optimal performance while
   * status and search filters enable targeted review processes that maintain
   * appropriate turnaround times for different content types and community
   * urgency levels.
   */
  export type IRequest = {
    /**
     * Page number for paginated results in the review queue - starts at 1
     * for user-friendly navigation. Essential for managing large review
     * queues efficiently while maintaining optimal response times for
     * moderator interfaces.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Number of items per page in the review queue - maximum 100 items per
     * page for performance optimization. Balances moderator efficiency with
     * system resource management during high-volume review periods.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * Filter by specific content type - articles only, comments only, or
     * comprehensive review across all content types. Useful for specialists
     * focusing on specific content types or for balanced review workload
     * distribution.
     */
    contentType?: "article" | "comment" | "all" | undefined;

    /**
     * Filter by specific moderation statuses that require attention.
     * Prioritizes workflow states like 'pending' and 'flagged' for active
     * review, enabling moderators to focus on content requiring immediate
     * decisions.
     */
    statuses: ("pending" | "flagged" | "under_review")[];

    /**
     * Search terms to find specific content items in the review queue -
     * searches title, content, and author information across
     * politics_bbs_articles and politics_bbs_comments tables. Supports
     * keyword-based identification of policy violations or specific
     * discussion topics requiring moderator attention.
     */
    search: string;

    /**
     * Filter by specific category to review content within that category
     * only. References politics_bbs_categories.code field to limit review
     * to particular economic policy or political discussion areas where
     * moderators have specialized expertise.
     */
    categoryCode?: string | null | undefined;

    /**
     * Filter content created after this timestamp to prioritize newer
     * submissions for timely review within platform service level
     * agreements. Ensures recent political and economic discussions receive
     * appropriate community standard enforcement.
     */
    createdAfter?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Filter content created before this timestamp to handle older pending
     * items and prevent review queue backlogs. Supports systematic review
     * management and prevents legitimate content from being delayed
     * indefinitely.
     */
    createdBefore?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
