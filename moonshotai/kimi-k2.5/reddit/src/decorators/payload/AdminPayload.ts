import { tags } from "typia";

export interface AdminPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "admin";
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
