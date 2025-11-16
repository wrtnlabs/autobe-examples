import { tags } from "typia";

/** JWT Payload for authenticated moderators */
export interface ModeratorPayload {
  /** Top-level moderator ID (primary key) */
  id: string & tags.Format<"uuid">;
  /** Session ID associated with moderator session */
  session_id: string & tags.Format<"uuid">;
  /** Role discriminator */
  type: "moderator";
}
