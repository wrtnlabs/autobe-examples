import { tags } from "typia";

export interface RegistereduserPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "registereduser";
}
