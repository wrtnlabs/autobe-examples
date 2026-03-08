import { tags } from "typia";

import { IRedditPlatformMember } from "./IRedditPlatformMember";
import { IRedditPlatformPost } from "./IRedditPlatformPost";

export namespace IRedditPlatformActivity {
  /**
   * Lightweight activity summary record for display in activity timelines, engagement history lists, and feed previews. Represents a single user action on the Reddit platform including post creation, comment creation, voting actions, and community subscription events. Optimized for efficient pagination by excluding large content fields while providing essential metadata about the activity type, related entity, actor, and timestamp.
   */
  export type ISummary = {
    /**
     * Unique identifier for this activity record.
     *
     * @x-autobe-specification UUID primary key for the activity record. Generated uniquely for each activity entry.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of activity that occurred.
     *
     * @x-autobe-specification Enum discriminator indicating the type of activity. Values: POST_CREATED (when user created a post), COMMENT_CREATED (when user created a comment), POST_VOTED (when user voted on a post), COMMENT_VOTED (when user voted on a comment), COMMUNITY_SUBSCRIBED (when user subscribed to a community).
     */
    activity_type:
      | "POST_CREATED"
      | "COMMENT_CREATED"
      | "POST_VOTED"
      | "COMMENT_VOTED"
      | "COMMUNITY_SUBSCRIBED";

    /**
     * Type of entity this activity is associated with.
     *
     * @x-autobe-specification Enum discriminator indicating the type of entity this activity relates to. Values: POST (activity relates to a post), COMMENT (activity relates to a comment), COMMUNITY (activity relates to a community).
     */
    entity_type: "POST" | "COMMENT" | "COMMUNITY";

    /**
     * ID of the entity this activity is associated with.
     *
     * @x-autobe-specification UUID reference to the entity (post, comment, or community) that this activity relates to. Used to fetch the full entity details if needed.
     */
    entity_id: string & tags.Format<"uuid">;

    /**
     * The user who performed this activity.
     *
     * @x-autobe-specification Reference to the user who performed this activity. Populated by joining with reddit_platform_members table. Always present as it represents the authenticated user.
     */
    actor: IRedditPlatformMember.ISummary;

    /**
     * The entity this activity is associated with (optional).
     *
     * @x-autobe-specification Optional reference to the entity this activity relates to. Populated by joining with the appropriate table (reddit_platform_posts, reddit_platform_comments, or reddit_platform_communities) based on entity_type. Can be null if the entity was deleted.
     */
    entity?: IRedditPlatformPost.ISummary | null | undefined;

    /**
     * When this activity occurred.
     *
     * @x-autobe-specification Timestamp when this activity occurred. Used for sorting and filtering activity timelines. Sorted in descending order (most recent first) for timeline display.
     */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Query parameters for searching and paginating user activity history records. Supports filtering by activity type, date range, entity type, and specific entity ID, with pagination and sorting controls for navigating engagement timelines.
   */
  export type IRequest = {
    /**
     * Filter by specific activity action type.
     *
     * @x-autobe-specification Filter by activity type enum. Valid values: POST_CREATED, COMMENT_CREATED, POST_VOTED, COMMENT_VOTED, COMMUNITY_SUBSCRIBED. Maps to UNION ALL results from multiple source tables where each activity type originates from a different table (reddit_platform_posts for POST_CREATED, reddit_platform_comments for COMMENT_CREATED, reddit_platform_post_votes for POST_VOTED, reddit_platform_comment_votes for COMMENT_VOTED, reddit_platform_community_subscriptions for COMMUNITY_SUBSCRIBED).
     */
    activityType?:
      | "POST_CREATED"
      | "COMMENT_CREATED"
      | "POST_VOTED"
      | "COMMENT_VOTED"
      | "COMMUNITY_SUBSCRIBED"
      | undefined;

    /**
     * Filter activities created on or after this date.
     *
     * @x-autobe-specification Date filter for activity creation timestamp. Activities with created_at >= createdAt are included. Format: ISO 8601 date-time string (e.g., 2024-01-15T10:30:00Z). Combined with createdAtEnd to form a date range filter.
     */
    createdAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter activities created on or before this date.
     *
     * @x-autobe-specification Date filter for activity creation timestamp. Activities with created_at <= createdAtEnd are included. Format: ISO 8601 date-time string (e.g., 2024-01-15T23:59:59Z). Combined with createdAt to form a date range filter.
     */
    createdAtEnd?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter by specific entity ID.
     *
     * @x-autobe-specification UUID of the entity (post, comment, or community) to filter activities by. Used in conjunction with entityType to narrow down activity records. Only activities where entity_id matches this UUID and entity_type matches entityType are returned.
     */
    entityId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by related entity type.
     *
     * @x-autobe-specification Filter by the type of entity the activity relates to. Valid values: POST, COMMENT, COMMUNITY. Used in conjunction with entityId to filter activities targeting a specific entity. Determines which entity table to JOIN with for enrichment data.
     */
    entityType?: "POST" | "COMMENT" | "COMMUNITY" | undefined;

    /**
     * Number of records per page (1-100).
     *
     * @x-autobe-specification Pagination limit for maximum records per page. Must be between 1 and 100 (inclusive). Defaults to 20 if not specified. Used to control the size of each page of results.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification 1-indexed page number for paginated results. Must be greater than or equal to 1. Page 1 returns the first batch of records (0 to limit-1). Used to navigate through large result sets.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sort order for activity records.
     *
     * @x-autobe-specification Sort order for activity records by created_at timestamp. Valid values: NEWEST (created_at DESC, most recent first), OLDEST (created_at ASC, oldest first). Determines the chronological order of activities in the result set.
     */
    sort?: "NEWEST" | "OLDEST" | undefined;
  };
}
