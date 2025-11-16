import { tags } from "typia";

export interface ModeratorPayload {
  /**
   * Top-level moderator table ID (the fundamental user identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the moderator user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "moderator";
}
