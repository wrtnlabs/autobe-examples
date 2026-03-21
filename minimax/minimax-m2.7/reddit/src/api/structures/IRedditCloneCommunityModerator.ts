import { tags } from "typia";

import { IRedditCloneCommunityBan } from "./IRedditCloneCommunityBan";
import { IRedditCloneMemberSession } from "./IRedditCloneMemberSession";

export namespace IRedditCloneCommunityModerator {
  /**
   * Request parameters for listing and filtering community moderators. Supports role filtering, date range filtering, member search, sorting, and pagination.
   */
  export type IRequest = {
    /**
     * Filter moderators assigned after this timestamp.
     *
     * @x-autobe-specification Filter moderators where created_at > assignedAfter. Applied as WHERE clause on reddit_clone_community_moderators.created_at via JOIN with reddit_clone_communities filtered by communityName path parameter. ISO 8601 datetime format.
     */
    assignedAfter?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter moderators assigned before this timestamp.
     *
     * @x-autobe-specification Filter moderators where created_at < assignedBefore. Applied as WHERE clause on reddit_clone_community_moderators.created_at via JOIN with reddit_clone_communities filtered by communityName path parameter. ISO 8601 datetime format.
     */
    assignedBefore?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Maximum number of moderators to return.
     *
     * @x-autobe-specification Maximum number of records to return per page. Applied as LIMIT clause in SQL query. Must be between 1 and 100. Default is implementation-defined (typically 20).
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Sort order for the results.
     *
     * @x-autobe-specification Sort direction for ORDER BY clause. Applied to sort field (created_at or role). 'asc' for ascending, 'desc' for descending. Default is 'desc' for created_at sort.
     */
    order?: "asc" | "desc" | undefined;

    /**
     * Page number for pagination.
     *
     * @x-autobe-specification Page number for offset-based pagination. Applied as OFFSET clause: OFFSET = (page - 1) * limit. Minimum value is 1. Default is 1.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Filter by moderator role type.
     *
     * @x-autobe-specification Filter by moderator role level. Maps to reddit_clone_community_moderators.role column via JOIN. Allowed values: 'owner' (community creator, highest authority) or 'moderator' (delegated powers). Optional filter - when omitted, returns all moderators including owners.
     */
    role?: "owner" | "moderator" | undefined;

    /**
     * Search moderators by username (partial match, case-insensitive).
     *
     * @x-autobe-specification Search moderators by member username. Applied via JOIN with reddit_clone_members table. Uses ILIKE or LIKE with '%' prefix for partial match, case-insensitive. Filters reddit_clone_members.username column.
     */
    searchMember?: string | undefined;

    /**
     * Field to sort results by.
     *
     * @x-autobe-specification Field to sort results by in ORDER BY clause. 'createdAt' sorts by reddit_clone_community_moderators.created_at (when moderator was assigned). 'role' sorts alphabetically by reddit_clone_community_moderators.role. Default is 'createdAt' with descending order.
     */
    sort?: "createdAt" | "role" | undefined;
  };

  /**
   * Summary representation of a community moderator assignment for list displays. Includes the moderator's identity, role level, and community context. Used in paginated moderator listings for community governance transparency.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property role
     */
    role: string;
    /**
     * @x-autobe-database-schema-property created_at
     */
    createdAt: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property member
     */
    member: IRedditCloneMemberSession.ISummary;

    /**
     * The member who assigned this moderator role. Null for owner (self-assigned on community creation).
     *
     * @x-autobe-database-schema-property assigner
     * @x-autobe-specification Join via reddit_clone_members using reddit_clone_community_moderators.assigned_by. Returns ISummary. Null when moderator is the owner (self-assigned on community creation).
     */
    assigner?: IRedditCloneMemberSession.ISummary | null | undefined;
    /**
     * @x-autobe-database-schema-property community
     */
    community: IRedditCloneCommunityBan.ISummary;
  };
}
