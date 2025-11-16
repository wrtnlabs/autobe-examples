import { tags } from "typia";

export interface ModeratorPayload {
  /**
   * Top-level moderator ID (the fundamental moderator identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the moderator. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
