import { tags } from "typia";

export interface MemberPayload {
  /** Top-level member table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the member user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "member";
}
