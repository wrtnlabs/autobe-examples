import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest table ID (the fundamental guest identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
