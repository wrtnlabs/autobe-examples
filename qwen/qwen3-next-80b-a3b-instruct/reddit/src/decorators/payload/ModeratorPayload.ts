import { tags } from "typia";

export interface ModeratorPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * This is the ID from the community_platform_members table (not the moderator
   * table's own id).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the moderator's authentication session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
