import { tags } from "typia";

export interface MemberPayload {
  /** Top-level member ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with this authentication (UUID) */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator */
  type: "member";
}
