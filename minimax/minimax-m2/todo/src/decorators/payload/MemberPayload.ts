import { tags } from "typia";

export interface MemberPayload {
  /** Member ID from the todo_app_members table */
  id: string & tags.Format<"uuid">;

  /** Session ID from the todo_app_member_sessions table */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator for member authentication */
  type: "member";
}
