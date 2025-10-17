import { tags } from "typia";

export interface UserPayload {
  id: string & tags.Format<"uuid">;
  type: "user";
  username: string;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}
