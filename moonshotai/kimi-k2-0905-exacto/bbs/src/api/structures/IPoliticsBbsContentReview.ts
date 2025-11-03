import { tags } from "typia";

import { IPoliticsBbsArticleCreator } from "./IPoliticsBbsArticleCreator";

export namespace IPoliticsBbsContentReview {
  /**
   * Query parameters for filtering content review queue - supports
   * pagination, content type filtering, status filtering, search
   * functionality, and date range filtering
   */
  export type IRequest = {
    /** Page number for paginated results in the review queue - starts at 1 */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Number of items per page in the review queue - maximum 100 items per
     * page
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;

    /**
     * Filter by specific content type - articles only, comments only, or
     * all content
     */
    contentType?: "article" | "comment" | "all" | undefined;

    /** Filter by specific moderation statuses that require attention */
    statuses: ("pending" | "flagged" | "under_review")[];

    /**
     * Search terms to find specific content items in the review queue -
     * searches title, content, and author information
     */
    search: string;

    /**
     * Filter by specific category to review content within that category
     * only
     */
    categoryCode?: string | undefined;

    /**
     * Filter content created after this timestamp to prioritize newer
     * submissions
     */
    createdAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter content created before this timestamp to handle older pending
     * items
     */
    createdBefore?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary information for a politics discussion board content review. This
   * DTO contains essential details about individual content reviews with
   * categorized reasoning, enabling moderators to quickly assess and process
   * review requests.
   *
   * Content reviews are created when articles are submitted for moderation or
   * when they are flagged by the community. The review process focuses on
   * ensuring content adheres to community guidelines while maintaining the
   * platform's focus on economic and political discourse.
   *
   * The summary format provides just enough information for moderation queue
   * displays and quick decision-making, excluding detailed content data that
   * would be visible in full detail views.
   */
  export type ISummary = {
    /**
     * Unique identifier for the content review record. Used for tracking
     * individual review requests through the moderation process.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reference to the article being reviewed. Links to the original
     * article content that is under review.
     */
    politics_bbs_article_id: string & tags.Format<"uuid">;

    /**
     * Category of the article under review. Provides context for moderation
     * decisions based on content topic and category-specific guidelines.
     */
    politics_bbs_category_id: string & tags.Format<"uuid">;

    /**
     * Short code identifier for the category. Enables quick categorization
     * for moderation queue filtering and context.
     */
    category_code: string;

    /**
     * Human-readable name for the article category. Helps moderators
     * understand content context at a glance.
     */
    category_name: string;

    /**
     * Title of the article under review. Essential for quick identification
     * and assessment of content.
     */
    article_title: string;

    /**
     * Summary information about the article creator. Includes basic profile
     * information to provide context for the review.
     */
    article_creator: IPoliticsBbsArticleCreator.ISummary;

    /**
     * Type of review requested: initial_submission or community_flagged.
     * Indicates why this content is under review.
     */
    review_type: string;

    /**
     * Priority level for review processing: normal (default) or urgent (for
     * flagged content). Helps prioritize urgent community reports over
     * routine submissions.
     */
    priority: string;

    /**
     * List of policy violations identified during review processing. Based
     * on automated content scanning and community reports.
     */
    violations: string[] & tags.MinItems<0>;

    /**
     * Current status of the review: pending, under_review, approved,
     * rejected, or appealed. Tracks progression through the moderation
     * workflow.
     */
    status: string;

    /**
     * Identifier of the moderator handling this review. Links to the
     * responsible moderator once review begins.
     */
    reviewed_by?: string | null | undefined;

    /**
     * Timestamp when this review was first requested. Used for queue
     * ordering and SLA tracking.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the most recent review update or change. Tracks review
     * progression and enables timeout detection.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Deadline for completing this review based on priority level. Ensures
     * timely processing of urgent community flags.
     */
    expires_at: (string & tags.Format<"date-time">) | null;
  };
}
