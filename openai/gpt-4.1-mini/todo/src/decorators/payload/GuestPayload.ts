import { tags } from "typia";

export interface GuestPayload {
  /** Top-level user ID (UUID format). */
  id: string & tags.Format<"uuid">;

  /** Session ID (UUID format). */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator. */
  type: "guest";
}
