import { tags } from "typia";

import { IRedditCommunityCommunity } from "./IRedditCommunityCommunity";
import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IRedditCommunityModerator {
  /**
   * Lightweight moderator assignment summary for listing contexts. Contains the assignment identifier, references to the community where the member serves as moderator, the moderator user profile, the user who added this moderator assignment, and the creation timestamp.
   */
  export type ISummary = {
    /**
     * Unique identifier for this moderator assignment record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from reddit_community_moderators.id. UUID primary key uniquely identifying each moderator assignment.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The community where this member serves as a moderator.
     *
     * @x-autobe-database-schema-property community
     * @x-autobe-specification Join from reddit_community_moderators.reddit_community_community_id to reddit_community_communities.id. Returns IRedditCommunity.ISummary.
     */
    community: IRedditCommunityCommunity.ISummary;

    /**
     * The member who holds the moderator role in this community.
     *
     * @x-autobe-database-schema-property moderator
     * @x-autobe-specification Join from reddit_community_moderators.reddit_community_moderator_id to reddit_community_members.id. Returns IRedditCommunityMember.ISummary.
     */
    moderator: IRedditCommunityMember.ISummary;

    /**
     * The member who added this moderator assignment to the community.
     *
     * @x-autobe-database-schema-property addedBy
     * @x-autobe-specification Join from reddit_community_moderators.added_by to reddit_community_members.id. Returns IRedditCommunityMember.ISummary.
     */
    addedBy: IRedditCommunityMember.ISummary;

    /**
     * Timestamp when this moderator assignment was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from reddit_community_moderators.created_at. Timestamp when this moderator assignment was created.
     */
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Pagination and filtering parameters for browsing moderators in a community. Supports sorting by creation date or username, filtering by username or date range, and paginated results.
   */
  export type IRequest = {
    /**
     * Current page number for paginated results (1-indexed).
     *
     * @x-autobe-specification Page number for pagination, 1-indexed. Default: 1, Minimum: 1. The client increments this to browse through paginated results (e.g., page 1, page 2, page 3).
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page (1-100).
     *
     * @x-autobe-specification Maximum number of records per page. Default: 20, Minimum: 1, Maximum: 100. Controls how many moderator records appear in each page response.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Field to sort results by (created_at or username).
     *
     * @x-autobe-specification Field to sort by. Values: 'created_at' (assignment creation date), 'username' (moderator username). Default: 'created_at'. Used with order parameter to control result ordering.
     */
    sort?: "created_at" | "username" | undefined;

    /**
     * Sort direction (asc or desc).
     *
     * @x-autobe-specification Sort direction. Values: 'asc' (ascending, oldest first), 'desc' (descending, newest first). Default: 'desc' (newest first). Used with sort parameter.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Search query to filter moderators by username.
     *
     * @x-autobe-specification Case-insensitive LIKE search on moderator username. Maximum length: 100 characters. Filters moderator list to show only moderators whose username contains the search string.
     */
    search?: (string & tags.MaxLength<100>) | undefined;

    /**
     * Search query to filter by the username of the user who added the moderator assignment.
     *
     * @x-autobe-specification Case-insensitive LIKE search on the username of the user who added this moderator assignment. Maximum length: 100 characters. Useful for finding which moderators were added by specific team members.
     */
    added_by_username?: (string & tags.MaxLength<100>) | undefined;

    /**
     * Filter for assignments created on or after this date-time.
     *
     * @x-autobe-specification ISO 8601 date-time filter. Returns moderator assignments created_at >= this value. Used to find assignments after a specific date.
     */
    created_at_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter for assignments created on or before this date-time.
     *
     * @x-autobe-specification ISO 8601 date-time filter. Returns moderator assignments created_at <= this value. Used to find assignments up to a specific date.
     */
    created_at_to?: (string & tags.Format<"date-time">) | undefined;
  };
}
