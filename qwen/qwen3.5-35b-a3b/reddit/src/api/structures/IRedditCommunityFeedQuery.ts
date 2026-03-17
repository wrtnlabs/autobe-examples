import { tags } from "typia";

import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";
import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IRedditCommunityFeedQuery {
  /**
   * Lightweight post summary optimized for feed list display. Contains essential information for displaying posts in home, popular, and community feeds: unique identifier, title, content preview, author reference, community reference, vote score, comment count, and creation timestamp. Excludes full content, attachments, post type details, and nested comments to keep payload minimal for list rendering.
   */
  export type ISummary = {
    /**
     * Unique identifier for the post.
     *
     * @x-autobe-specification Direct mapping from reddit_community_posts.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Title of the post.
     *
     * @x-autobe-specification Direct mapping from reddit_community_posts.title. Required field up to 300 characters.
     */
    title: string;

    /**
     * First 200 characters of post content for list display. Truncated if content is longer.
     *
     * @x-autobe-specification Computed: first 200 characters of content field from post body, truncated if longer. For link posts, extract domain name. For image posts, may include alt text.
     */
    contentPreview: string;

    /**
     * The user who created this post.
     *
     * @x-autobe-specification JOIN from reddit_community_posts.author_id to reddit_community_members.id. Returns IRedditCommunityMember.ISummary with id, username, and masked email.
     */
    author: IRedditCommunityMember.ISummary;

    /**
     * The community where this post was created.
     *
     * @x-autobe-specification JOIN from reddit_community_posts.community_id to reddit_community_communities.id. Returns IRedditCommunity.ISummary with id, name, and subscriber_count.
     */
    community: IRedditCommunityCommunity.ISummary;

    /**
     * Net vote score (upvotes minus downvotes) for this post.
     *
     * @x-autobe-specification Computed: SUM(CASE WHEN vote.direction = 'up' THEN 1 WHEN vote.direction = 'down' THEN -1 ELSE 0 END) FROM reddit_community_votes WHERE target_id = post.id AND target_type = 'post'. Result can be negative.
     */
    voteScore: number & tags.Type<"int32">;

    /**
     * Total number of comments on this post.
     *
     * @x-autobe-specification Computed: COUNT(*) FROM reddit_community_comments WHERE reddit_community_posts_id = post.id AND deleted_at IS NULL. Includes all nested reply depth.
     */
    commentCount: number & tags.Type<"int32">;

    /**
     * Timestamp when this post was created.
     *
     * @x-autobe-specification Direct mapping from reddit_community_posts.created_at. Timestamp when post was originally created.
     */
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Search criteria and pagination parameters for retrieving a personalized home feed of posts from subscribed communities. Supports sorting by hot (recent + engagement), new (recency), top (vote score with time filter), or controversial (high votes near zero score), content type filtering, and cursor-based pagination.
   */
  export type IRequest = {
    /**
     * Sorting method for the feed. Options: hot (trending), new (recent), top (highest scored), controversial (high engagement but balanced).
     *
     * @x-autobe-specification Determines feed sorting algorithm: hot (exponential decay of vote score + recency), new (createdAt descending), top (voteScore descending with timeFilter), controversial (vote score proximity to zero with high total votes). Computed at query time, not stored in DB.
     */
    sortOrder?: "hot" | "new" | "top" | "controversial" | null | undefined;

    /**
     * Time range filter for top posts sorting. Options: today, week, month, year, all (no filter). Only applies when sortOrder is top.
     *
     * @x-autobe-specification Time range filter applied when sortOrder=top. Restricts top posts to: today (24h), week (7d), month (30d), year (365d), or all (unlimited). Computed via createdAt timestamp comparison at query time.
     */
    timeFilter?: "today" | "week" | "month" | "year" | "all" | null | undefined;

    /**
     * Filter posts by content type. Options: text, link, image. Limits results to posts matching the specified type.
     *
     * @x-autobe-specification Filters posts by content type discriminator: text (body content), link (URL), image (uploaded file). Maps to reddit_community_posts.type column. Computed filter at query time, not a DB column in this DTO.
     */
    postType?: "text" | "link" | "image" | null | undefined;

    /**
     * Cursor token for pagination. Use the token from a previous response to get the next page of results.
     *
     * @x-autobe-specification Cursor token string from previous response for cursor-based pagination. Contains encoded query parameters and last post ID. Enables efficient next/prev page navigation without offset-based queries. Computed server-side, stored in client, returned in response.
     */
    paginationToken?: string | null | undefined;

    /**
     * Maximum number of posts to return per page. Must be between 1 and 100. Defaults to server setting if omitted.
     *
     * @x-autobe-specification Number of records per page (1-100). Limits the batch size for cursor-based pagination. Enforced by server - request beyond bounds will be adjusted to max (100). Computed from request, not stored in DB.
     */
    pageSize?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | null
      | undefined;

    /**
     * Target page number (1-indexed). Use when cursor-based pagination token is not available. Defaults to 1.
     *
     * @x-autobe-specification 1-indexed page number as fallback pagination. Minimum 1 to indicate first page. Used when cursor-based pagination not available.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return. Defaults to 100 if omitted. Used for simple pagination when cursor-based method is not available.
     *
     * @x-autobe-specification Maximum number of records to return as fallback pagination control. Defaults to 100 if omitted. Minimum 1 for valid results.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
