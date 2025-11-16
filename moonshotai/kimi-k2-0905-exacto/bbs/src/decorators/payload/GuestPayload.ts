import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest user ID. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the guest type. */
  type: "guest";
}
