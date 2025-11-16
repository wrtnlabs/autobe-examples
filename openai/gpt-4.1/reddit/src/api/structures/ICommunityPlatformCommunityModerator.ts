import { tags } from "typia";

import { ICommunityPlatformCommunity } from "./ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "./ICommunityPlatformModerator";

export namespace ICommunityPlatformCommunityModerator {
  /**
   * Search and filter parameters for retrieving the list of moderators
   * assigned to a specific community. This DTO enables advanced filtering,
   * search keywords, assignment status, and pagination for querying the
   * moderators managing a given community. Used for moderator management
   * panels and administrative audits. This schema does not accept sensitive
   * or system-managed fields.
   */
  export type IRequest = {
    /**
     * Assignment status of the moderator within the community (e.g.,
     * 'active', 'suspended', 'pending', or 'removed'). Used to filter
     * moderator assignments by their current lifecycle state.
     */
    status?: string | undefined;

    /**
     * Lower bound (inclusive) for the assigned_at timestamp, for filtering
     * moderators assigned after this date. ISO 8601 date format.
     */
    assigned_from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Upper bound (inclusive) for the assigned_at timestamp, for filtering
     * moderators assigned before this date. ISO 8601 date format.
     */
    assigned_to?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Keyword to search moderator profile metadata (e.g., moderator
     * username or display name). Supports partial match where applicable.
     */
    search?: string | undefined;

    /**
     * Field to sort the moderator list by. Supported fields: 'assigned_at',
     * 'status'.
     */
    order_by?: "assigned_at" | "status" | undefined;

    /** Sort order direction: 'asc' for ascending, 'desc' for descending. */
    order_direction?: "asc" | "desc" | undefined;

    /** Pagination: Page number to retrieve (1-based index). */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Pagination: Maximum number of moderator records to return per page.
     * Must not exceed 100.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;
  };

  /**
   * Summary record of a moderator assigned to a specific community.
   *
   * Includes identifiers for the assignment, the referenced community, the
   * summarized moderator entity, assignment time, and current status. Used in
   * listings of moderators for administration, compliance, and directory
   * APIs.
   *
   * Directly maps to a row in `community_platform_community_moderators`.
   */
  export type ISummary = {
    /**
     * Primary key.
     *
     * The unique identifier for this moderator assignment within the
     * community. Used for reference, removal, and management.
     *
     * Corresponds to the `id` column in
     * `community_platform_community_moderators`.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Community to which the moderator is assigned.
     *
     * References the target community entity (summary form) this moderator
     * manages. Populated from the `community_platform_community_id` foreign
     * key.
     *
     * Always present.
     */
    community: ICommunityPlatformCommunity.ISummary;

    /**
     * Reference to the moderator user account/entities (summary form).
     *
     * Points to a summary DTO of the platform moderator (see
     * `community_platform_moderators`, part of the Actors
     * service/component). Provides display and context fields for UI and
     * logic.
     *
     * Resolved from the `moderator_id` foreign key.
     */
    moderator: ICommunityPlatformModerator.ISummary;

    /**
     * When this user was assigned moderation authority for this community.
     *
     * ISO8601 UTC timestamp string. Used for displaying assignment
     * timelines and audit.
     */
    assigned_at: string & tags.Format<"date-time">;

    /**
     * Current status: active, suspended, pending, or removed.
     *
     * Indicates the lifecycle status of the moderator's assignment.
     * Typically managed by platform or community administrators. String
     * (enum-like, but open for future expansion).
     */
    status: string;
  };
}
