import { tags } from "typia";

export interface CustomerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "customer";
}
