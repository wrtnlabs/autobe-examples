import { tags } from "typia";

export interface ModeratorPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * For moderator, this is the ID from the community_bbs_moderator table (as
   * moderator is a primary entity).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the moderator user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
