import { tags } from "typia";

import { ICommunityBbsCommunity } from "./ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "./ICommunityBbsCommunityMember";

export namespace ICommunityBbsCommunityModerator {
  /**
   * Summary of a moderator assignment. Represents a community moderator
   * assignment (community_bbs_community_moderators) in a lightweight form for
   * response DTOs. Provides assignment id, assigned moderator member summary,
   * community summary, role, assigned_at and active flag.
   */
  export type ISummary = {
    /** Moderator-assignment id (community_bbs_community_moderators.id). */
    id: string & tags.Format<"uuid">;

    /** Summary of the community the moderator assignment belongs to. */
    community: ICommunityBbsCommunity.ISummary;

    /** Summary of the community member who holds this moderator assignment. */
    moderator_member: ICommunityBbsCommunityMember.ISummary;

    /** Moderator role/scope (for example: 'moderator','senior_moderator'). */
    role: string;

    /** Timestamp when the moderator was assigned. */
    assigned_at: string & tags.Format<"date-time">;

    /** Whether the moderator assignment is currently active. */
    active: boolean;
  };
}
