import { tags } from "typia";

/** Payload for authenticated discussion board member. */
export interface MemberPayload {
  /** Top-level member ID (discussion_board_members.id) */
  id: string & tags.Format<"uuid">;
  /** Discriminator for the union type (must be 'member') */
  type: "member";
}
