import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest user ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for guest role. */
  type: "guest";
}
