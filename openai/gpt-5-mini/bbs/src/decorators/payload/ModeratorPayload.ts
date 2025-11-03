import { tags } from "typia";

export interface ModeratorPayload {
  /** Top-level moderator table ID (the fundamental moderator identifier). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated moderator. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for role identification. */
  type: "moderator";
}
