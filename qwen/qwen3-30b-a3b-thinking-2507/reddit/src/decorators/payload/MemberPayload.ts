import { tags  from "typia";

export interface MemberPayload {
  id: string & tags.Format<"uuid">;
  session_id: string & tags.Format<"uuid">;
  type: "member";
}
