import { tags } from "typia";

export interface MemberPayload {
  /** Member ID (primary identifier for the member in the discussion board). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated member. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "member";
}
