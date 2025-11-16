import { tags } from "typia";

export interface GuestPayload {
  /** Guest visitor identifier (primary key from discussion_board_guests table). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest visitor. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
