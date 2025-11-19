import { tags } from "typia";

export interface GuestPayload {
  /** Guest identifier (primary key of discussion_board_guests table). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
