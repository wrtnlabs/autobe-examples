import { tags } from "typia";

export namespace IEconomicDiscussionModerators {
  /**
   * Lightweight summary representation of moderators for article attribution
   * and administrative display.
   *
   * This variant provides essential moderator information for contexts where
   * full moderator details are unnecessary or would reveal sensitive
   * administrative information. It includes core identity and role
   * information while maintaining appropriate privacy boundaries.
   *
   * The summary is particularly useful for displaying article authors and
   * moderation activities without exposing advanced administrative
   * capabilities or detailed moderator profiles.
   */
  export type ISummary = {
    /** Primary key identifier for the moderator */
    id: string & tags.Format<"uuid">;

    /** Unique moderator display name */
    username: string;

    /** Authorization level for different moderation scopes */
    moderation_level: "standard" | "senior" | "admin";

    /** Moderator appointment timestamp */
    created_at: string & tags.Format<"date-time">;
  };
}
