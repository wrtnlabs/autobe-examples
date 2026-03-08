import { tags } from "typia";

export interface GuestPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "guest";
}
