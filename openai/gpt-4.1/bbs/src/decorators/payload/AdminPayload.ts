import { tags } from "typia";

export interface AdminPayload {
  id: string & tags.Format<"uuid">;
  type: "admin";
}
