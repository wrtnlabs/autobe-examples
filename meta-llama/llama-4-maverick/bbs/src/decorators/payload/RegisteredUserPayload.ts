import { tags } from "typia";

export interface RegisteredUserPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "registered_user";
}
