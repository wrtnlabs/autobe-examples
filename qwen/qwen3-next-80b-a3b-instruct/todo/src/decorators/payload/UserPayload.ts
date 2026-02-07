import { tags } from "typia";

export interface UserPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "user";
}
