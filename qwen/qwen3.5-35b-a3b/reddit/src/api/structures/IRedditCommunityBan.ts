import { tags } from "typia";

import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";
import { IRedditCommunityMember } from "./IRedditCommunityMember";
import { IRedditCommunityModerator } from "./IRedditCommunityModerator";

export namespace IRedditCommunityBan {
  /**
   * Query parameters and filters for retrieving banned users in a community, supporting date range filtering, moderator filtering, text search, and pagination.
   */
  export type IRequest = {
    /**
     * Lower bound for banned_at timestamp filter, inclusive.
     *
     * @x-autobe-specification Filter: banned_at >= value. Excludes bans enacted before this timestamp. ISO 8601 date-time format.
     */
    banned_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound for banned_at timestamp filter, inclusive.
     *
     * @x-autobe-specification Filter: banned_at <= value. Excludes bans enacted after this timestamp. ISO 8601 date-time format.
     */
    banned_at_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * UUID of the moderator who enacted the ban, filtering bans by specific moderator.
     *
     * @x-autobe-database-schema-property banned_by_moderator_id
     * @x-autobe-specification Filter: WHERE banned_by_moderator_id = value. UUID of the moderator who enacted the ban.
     */
    banned_by_moderator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Case-insensitive text search across user username and display name fields.
     *
     * @x-autobe-specification Computed: case-insensitive search across joined user tables (reddit_community_members.username + display_name). Partial match on either field.
     */
    text_search?: string | undefined;

    /**
     * Page number for pagination (1-indexed), defaults to 1.
     *
     * @x-autobe-specification Pagination parameter: page number (1-indexed, minimum 1). Defaults to 1 if not provided.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of items to return per page (1-100, default 20).
     *
     * @x-autobe-specification Pagination parameter: items per page (minimum 1, maximum 100, default 20). Limits the maximum number of records returned.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Lightweight summary representation of a community ban record for listing views. Contains ban identification, reason, active status timestamps, and references to the banned member, community, and banning moderator. Used in paginated ban list responses to minimize payload while retaining key moderation information.
   */
  export type ISummary = {
    /**
     * Unique identifier for this ban record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_bans.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Reason for the ban (e.g., spam, harassment, terms violation).
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from reddit_community_bans.reason. Stores the ban reason.
     */
    reason: string;

    /**
     * Timestamp when the ban was enacted.
     *
     * @x-autobe-database-schema-property banned_at
     * @x-autobe-specification Direct mapping from reddit_community_bans.banned_at. ISO 8601 timestamp.
     */
    bannedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when the ban was lifted. Null if the ban is still active.
     *
     * @x-autobe-database-schema-property unbanned_at
     * @x-autobe-specification Direct mapping from reddit_community_bans.unbanned_at. Nullable ISO 8601 timestamp. Null if still banned.
     */
    unbannedAt: (string & tags.Format<"date-time">) | null;

    /**
     * Record creation timestamp.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_bans.created_at. ISO 8601 timestamp.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Record update timestamp.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from reddit_community_bans.updated_at. ISO 8601 timestamp.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Soft deletion timestamp. Null if the record is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from reddit_community_bans.deleted_at. Nullable ISO 8601 timestamp. Null if not soft-deleted.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;

    /**
     * The member who is banned from the community.
     *
     * @x-autobe-database-schema-property bannedMember
     * @x-autobe-specification JOIN from reddit_community_bans.bannedMember.relation to reddit_community_members. Returns IRedditCommunityMember.ISummary.
     */
    bannedMember: IRedditCommunityMember.ISummary;

    /**
     * The community where the ban applies.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification JOIN from reddit_community_bans.community.relation to reddit_community_communities. Returns IRedditCommunity.ISummary.
     */
    community: IRedditCommunityCommunity.ISummary;

    /**
     * The moderator who issued the ban.
     *
     * @x-autobe-database-schema-property bannedByModerator
     * @x-autobe-specification JOIN from reddit_community_bans.bannedByModerator.relation to reddit_community_moderators. Returns IRedditCommunityModerator.ISummary.
     */
    bannedByModerator: IRedditCommunityModerator.ISummary;
  };
}
