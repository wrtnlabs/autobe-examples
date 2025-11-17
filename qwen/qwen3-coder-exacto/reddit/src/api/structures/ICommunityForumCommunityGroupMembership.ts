import { tags } from "typia";

import { ICommunityForumCommunityUser } from "./ICommunityForumCommunityUser";
import { ICommunityForumCommunityGroup } from "./ICommunityForumCommunityGroup";

export namespace ICommunityForumCommunityGroupMembership {
  /**
   * Summary representation of a community membership for list views and
   * references.
   *
   * This lightweight version of the membership entity is optimized for
   * displaying user subscriptions and community member lists. It contains
   * essential information about the membership relationship without the
   * overhead of full details.
   *
   * The summary includes core identifying information (id), membership status
   * (status, role), temporal information (joined_at, left_at, banned_until),
   * references to the user and community, and audit timestamps (created_at,
   * updated_at, deleted_at).
   *
   * Sensitive information such as detailed timestamps are excluded to
   * maintain security and performance. All relationships to other entities
   * are represented through summary references to prevent circular
   * dependencies.
   */
  export type ISummary = {
    /** Primary Key. */
    id: string & tags.Format<"uuid">;

    /**
     * Current membership status. Valid values: 'active', 'inactive',
     * 'pending', 'banned'.
     */
    status: string;

    /**
     * User's role within the community. Valid values: 'member',
     * 'moderator', 'admin'.
     */
    role: string;

    /** UTC timestamp when the user officially joined the community. */
    joined_at: string & tags.Format<"date-time">;

    /** UTC timestamp when the user left the community, if applicable. */
    left_at?: (string & tags.Format<"date-time">) | undefined;

    /** If banned, the reason for the ban. */
    banned_reason?: string | undefined;

    /** If banned temporarily, the time when the ban expires. */
    banned_until?: (string & tags.Format<"date-time">) | undefined;

    /** UTC timestamp when this membership record was created. */
    created_at: string & tags.Format<"date-time">;

    /** UTC timestamp when this membership record was last modified. */
    updated_at: string & tags.Format<"date-time">;

    /** UTC timestamp when this membership was soft deleted, if applicable. */
    deleted_at?: (string & tags.Format<"date-time">) | undefined;

    /** User who holds this membership. */
    user: ICommunityForumCommunityUser.ISummary;

    /** Community to which this membership belongs. */
    community: ICommunityForumCommunityGroup.ISummary;
  };

  /**
   * Request parameters for filtering and paginating community memberships.
   *
   * This DTO is used to specify search criteria and pagination options when
   * retrieving lists of community memberships.
   */
  export type IRequest = {
    /** Page number for pagination (starting from 1). */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /** Number of items per page (max 100). */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /** Field to sort memberships by. */
    sort_by?: "joined_at" | "role" | undefined;

    /** Sort order (ascending or descending). */
    order?: "asc" | "desc" | undefined;

    /** Filter by membership status. */
    status?: "active" | "inactive" | "pending" | "banned" | null | undefined;

    /** Filter by membership role. */
    role?: "member" | "moderator" | "admin" | null | undefined;
  };
}
