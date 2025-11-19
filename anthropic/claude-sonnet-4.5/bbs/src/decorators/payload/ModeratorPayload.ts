import { tags } from "typia";

export interface ModeratorPayload {
  /** Moderator account ID (primary identifier for the moderator). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated moderator. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the moderator role type. */
  type: "moderator";
}
