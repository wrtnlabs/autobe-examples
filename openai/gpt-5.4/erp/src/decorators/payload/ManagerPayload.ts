import { tags } from "typia";

export interface ManagerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "manager";
}
