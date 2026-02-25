import { tags } from "typia";

export interface CitizenPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "citizen";
}
