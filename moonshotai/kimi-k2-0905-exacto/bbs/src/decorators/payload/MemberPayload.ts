import { tags } from "typia";

export interface MemberPayload {
  /** Top-level member table ID. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the member. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for member role. */
  type: "member";
}
