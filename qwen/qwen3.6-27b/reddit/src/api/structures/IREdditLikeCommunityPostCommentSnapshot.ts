import { tags } from "typia";

import { IREdditLikeCommunityComment } from "./IREdditLikeCommunityComment";

export namespace IREdditLikeCommunityPostCommentSnapshot {
  /**
   * Summary representation of an immutable point-in-time snapshot capturing a comment's content at the moment it was created or edited.
   *
   * Snapshots preserve the exact text body, threading context through parent references, and creation timestamp of comments. Used to reconstruct comment revision history and provide audit trails for content changes.
   */
  export type ISummary = {
    /**
     * Unique identifier for the comment snapshot record.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_post_comment_snapshots.id. Primary key
         *   uniquely identifying the snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The comment that was snapshotted, including its current summary representation.
     *
         * @x-autobe-database-schema-property comment
         * @x-autobe-specification Join from
         *   reddit_like_community_post_comment_snapshots.comment_id to
         *   reddit_like_community_comments.id. Returns
         *   IRedditLikeCommunityComment.ISummary via $ref.
     */
    comment: IREdditLikeCommunityComment.ISummary;

    /**
     * The parent comment in the threading hierarchy, if this snapshot captures a reply. Null for top-level comments.
     *
         * @x-autobe-database-schema-property parentComment
         * @x-autobe-specification Join from
         *   reddit_like_community_post_comment_snapshots.parent_comment_id to
         *   reddit_like_community_comments.id. Nullable - null for top-level
         *   comment snapshots. Returns IRedditLikeCommunityComment.ISummary via
         *   $ref or null.
     */
    parentComment: IREdditLikeCommunityComment.ISummary | null;

    /**
     * The exact text content of the comment at the time this snapshot was created.
     *
     * This value is immutable and preserves the original content even if the parent comment is later edited or deleted.
     *
         * @x-autobe-database-schema-property body
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_post_comment_snapshots.body. Immutable text
         *   content captured at snapshot time.
     */
    body: string;

    /**
     * Timestamp when this snapshot was recorded.
     *
     * Immutable timestamp marking the exact point-in-time when the comment's content was captured.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_post_comment_snapshots.created_at. Immutable
         *   timestamp of snapshot creation.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Query parameters for filtering and paginating comment snapshots for search and list operations. All fields are optional to retrieve all snapshots with default pagination. Use date ranges to narrow results by creation time and use page/limit for pagination control.
   *
   * This request DTO serves endpoints like PATCH /redditLikeCommunity/guest/posts/{postId}/comments/{commentId}/snapshots.
   */
  export type IRequest = {
    /**
     * Optional start boundary for filtering snapshots by the `created_at` timestamp. This parameter restricts results to snapshots created at or after the specified timestamp, using ISO date-time format.
     *
     * When combined with dateRangeMax, it defines a complete time window for results.
     *
         * @x-autobe-specification Query parameter filtering on `created_at`
         *   column from `reddit_like_community_post_comment_snapshots`. Only
         *   accepts ISO date-time values for range filtering logic.
     */
    dateRangeMin?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Optional end boundary for filtering snapshots by the `created_at` timestamp. This parameter restricts results to snapshots created before the specified timestamp, using ISO date-time format.
     *
     * When combined with dateRangeMin, it defines a complete time window for results.
     *
         * @x-autobe-specification Query parameter filtering on `created_at`
         *   column from `reddit_like_community_post_comment_snapshots`. Only
         *   accepts ISO date-time values for range filtering logic.
     */
    dateRangeMax?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Pagination parameter controlling the page number to retrieve. Page numbers are 1-indexed (first page is 1).
     *
     * Used to navigate through paginated results. Combine with limit to control result size per page.
     *
         * @x-autobe-specification Offset-based pagination parameter. Minimum
         *   value is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Pagination parameter controlling how many snapshots per page. Maximum of 100 results per page.
     *
     * Combine with page to navigate through paginated results. Value must be between 1 and 100.
     *
         * @x-autobe-specification Offset-based pagination parameter. Minimum is
         *   1, maximum is 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
