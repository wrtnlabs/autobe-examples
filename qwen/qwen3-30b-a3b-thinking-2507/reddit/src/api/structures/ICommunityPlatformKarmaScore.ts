import { tags } from "typia";

import { ICommunityPlatformMember } from "./ICommunityPlatformMember";

export namespace ICommunityPlatformKarmaScore {
  /**
   * Lightweight karma score summary containing user identifier, current score, and timestamps for display in feed views and user profiles.
   */
  export type ISummary = {
    /**
     * Unique identifier for the karma score record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from karma_scores.id. UUID PK.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The user associated with this karma score.
     *
     * @x-autobe-database-schema-property member
     * @x-autobe-specification Join from karma_scores.community_platform_members_id to members.id. Returns user profile summary (ICommunityPlatformMember.ISummary).
     */
    member: ICommunityPlatformMember.ISummary;

    /**
     * The user's current karma score, reflecting all voting activity.
     *
     * @x-autobe-database-schema-property karma_score
     * @x-autobe-specification Direct mapping from karma_scores.karma_score. Stores current user karma (1 point per upvote, -1 per downvote).
     */
    karma_score: number & tags.Type<"int32">;

    /**
     * Timestamp when this karma score record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from karma_scores.created_at. Database timestamp when score was first recorded.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when this karma score record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from karma_scores.updated_at. Database timestamp when score was last modified.
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
