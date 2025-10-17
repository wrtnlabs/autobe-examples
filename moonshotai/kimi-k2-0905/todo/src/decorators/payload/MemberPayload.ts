import { tags } from "typia";

export interface MemberPayload {
  /** Top-level user table ID (todo_member.id). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "member";
}
