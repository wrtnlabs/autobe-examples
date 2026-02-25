import { tags } from "typia";

export interface OwnerPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "owner";
}
