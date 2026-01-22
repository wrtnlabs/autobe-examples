import { tags } from "typia";

export interface GuestPayload {
  /** Top-level session identifier for guest access - not a database record ID. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest access. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
