import { tags } from "typia";

import { IRedditCommunityMember } from "./IRedditCommunityMember";
import { IRedditCommunityVote } from "./IRedditCommunityVote";

export namespace IRedditCommunityKarmaSnapshot {
  /**
   * Pagination and filter parameters for querying karma snapshot audit records.
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-indexed).
     *
     * @x-autobe-specification Page number for cursor-based pagination (1-indexed). Used to calculate offset from cursor timestamp.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum records per page (1-100).
     *
     * @x-autobe-specification Maximum number of records to return per page (1-100). Enforced by service layer for performance.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Cursor timestamp for pagination (created_at of last fetched record).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Cursor timestamp (created_at) for pagination. Used to fetch records after this timestamp for consistent ordering.
     */
    cursor?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sort field: created_at or karma_delta.
     *
     * @x-autobe-specification Field to sort by: created_at (default) or karma_delta. Does not map to DB column directly; used as ORDER BY clause.
     */
    sort?: "created_at" | "karma_delta" | undefined;

    /**
     * Sort direction: asc (ascending) or desc (descending).
     *
     * @x-autobe-specification Sort direction: asc (ascending) or desc (descending). Applied to sort field in ORDER BY clause.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Filter by user ID whose karma changed.
     *
     * @x-autobe-database-schema-property reddit_community_user_id
     * @x-autobe-specification Filter by user whose karma changed. Maps to reddit_community_user_id column. UUID format required.
     */
    user_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by vote ID that triggered the karma change.
     *
     * @x-autobe-database-schema-property reddit_community_vote_id
     * @x-autobe-specification Filter by vote ID that triggered the karma change. Maps to reddit_community_vote_id column. UUID format required.
     */
    vote_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by karma delta value (-1 for downvote, +1 for upvote).
     *
     * @x-autobe-database-schema-property karma_delta
     * @x-autobe-specification Filter by karma delta value. Valid values: -1 (downvote), +1 (upvote). Maps to karma_delta column.
     */
    karma_delta?:
      | (number & tags.Type<"int32"> & tags.Minimum<-1> & tags.Maximum<1>)
      | undefined;

    /**
     * Start of created_at date range (inclusive).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Start of created_at date range filter. Records with created_at >= this value are included. ISO 8601 date-time format.
     */
    created_at_start?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of created_at date range (inclusive).
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification End of created_at date range filter. Records with created_at <= this value are included. ISO 8601 date-time format.
     */
    created_at_end?: (string & tags.Format<"date-time">) | undefined;
  };

  /**
   * Summary view of karma change audit records showing point-in-time snapshots of user karma score changes. Each record tracks a vote operation that affected a user's karma, including the delta applied and resulting score. Used for displaying karma history in user profiles and audit logs.
   */
  export type ISummary = {
    /**
     * Unique identifier for this karma snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The user whose karma score changed due to this vote.
     *
     * @x-autobe-database-schema-property user
     * @x-autobe-specification Join from reddit_community_karma_snapshots.user to reddit_community_members.id. Returns IRedditCommunityMember.ISummary with username and display_name.
     */
    user: IRedditCommunityMember.ISummary;

    /**
     * The vote operation that triggered this karma change.
     *
     * @x-autobe-database-schema-property vote
     * @x-autobe-specification Join from reddit_community_karma_snapshots.vote to reddit_community_votes.id. Returns IRedditCommunityVote.ISummary with vote_type.
     */
    vote: IRedditCommunityVote.ISummary;

    /**
     * The change in karma score caused by this vote: +1 for upvote, -1 for downvote.
     *
     * @x-autobe-database-schema-property karma_delta
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.karma_delta. Integer: +1 for upvote, -1 for downvote.
     */
    karma_delta: number & tags.Type<"int32">;

    /**
     * The user's total karma score after applying this delta.
     *
     * @x-autobe-database-schema-property karma_after_change
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.karma_after_change. Integer representing the user's cumulative karma score after applying the delta.
     */
    karma_after_change: number & tags.Type<"int32">;

    /**
     * Timestamp when this karma change was recorded.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.created_at. Timestamp when this karma change was recorded.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.updated_at. Timestamp when this record was last updated.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp, null if active. Must return 404 if this snapshot has been soft-deleted.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from reddit_community_karma_snapshots.deleted_at. Nullable timestamp for soft deletion. Must return 404 if deleted_at IS NOT NULL.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
