import { tags } from "typia";

import { IREdditLikeCommunityMember } from "./IREdditLikeCommunityMember";

export namespace IREdditLikeCommunityComment {
  /**
   * Search criteria for fetching a paginated list of comments on a post.
   *
   * Supports sorting by recency ('new'), popularity ('best'), or opinion divergence ('controversial'). Pagination is controlled via 'page' and 'limit' fields to navigate large result sets.
   */
  export type IRequest = {
    /**
     * Maximum number of comments to return per page.
     *
     * Defaults to the server's configured default page size if not provided. The server may enforce a maximum limit (e.g., 100).
     *
         * @x-autobe-specification Pagination size limit. Used to set the SQL
         *   LIMIT clause. Capped at a server-defined maximum (e.g., 100).
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number to retrieve (1-indexed).
     *
     * Defaults to 1 if not provided. Used to navigate through large result sets.
     *
         * @x-autobe-specification Pagination offset. Used to calculate SQL
         *   OFFSET = (page - 1) * limit. If not provided, defaults to 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sorting criteria for the comment list.
     *
     * Supported values:
     * - 'new': Sort by creation time, most recent first (created_at DESC).
     * - 'best': Sort by vote score, highest first (vote_score DESC).
     * - 'controversial': Sort by vote variance, highest divergence first.
     *
     * Defaults to 'new' if not provided.
     *
         * @x-autobe-specification Sorting criteria. Determines ORDER BY clause:
         *   - 'new': ORDER BY comments.created_at DESC - 'best': ORDER BY
         *   vote_score DESC (sum of +1 upvote, -1 downvote) - 'controversial':
         *   ORDER BY vote variance or similar metric.
     */
    sort?: "new" | "best" | "controversial" | undefined;
  };

  /**
   * A flat summary of a comment optimized for paginated list displays.
   *
   * Contains the comment identifier, author information via author field referencing the member's summary, the comment content text, the calculated vote_score reflecting net community vote direction (upvotes minus downvotes), and the created_at timestamp when the comment was posted. Threaded reply structures are not included — use the dedicated endpoint for hierarchical comment trees.
   */
  export type ISummary = {
    /**
     * Unique identifier for the comment record.
     *
     * System-generated UUID that serves as the primary key for this comment.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_comments.id. Primary key UUID.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The member who authored this comment.
     *
     * Contains the author's identity information including their UUID, username, email address, and account creation timestamp.
     *
         * @x-autobe-database-schema-property member
         * @x-autobe-specification BELONGS-TO relation via member_id FK to
         *   reddit_like_community_members table. Joins to return
         *   IRedditLikeCommunityMember.ISummary containing author's id,
         *   username, email, and created_at.
     */
    author: IREdditLikeCommunityMember.ISummary;

    /**
     * The text content of the comment.
     *
     * Stores what the user wrote. Can be edited by the author, though this summary reflects the current content state.
     *
         * @x-autobe-database-schema-property content
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_comments.content. The text body of the
         *   comment.
     */
    content: string;

    /**
     * The net vote score reflecting community sentiment.
     *
     * Calculated as total upvotes minus total downvotes. Positive values indicate community approval, negative values indicate disapproval, and zero means no net votes.
     *
         * @x-autobe-specification Computed by aggregating
         *   reddit_like_community_comment_votes via LEFT JOIN on comment_id.
         *   vote_score = sum of +1 for 'upvote' direction minus sum of +1 for
         *   'downvote' direction. Always returns an integer (zero or
         *   positive/negative).
     */
    vote_score: number & tags.Type<"int32">;

    /**
     * Timestamp when the comment was first created.
     *
     * Immutable date-time value indicating when the user originally posted this comment.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   reddit_like_community_comments.created_at. ISO 8601 datetime
         *   timestamp.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
