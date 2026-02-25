import { tags } from "typia";

export interface ModeratorPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "moderator";
}
