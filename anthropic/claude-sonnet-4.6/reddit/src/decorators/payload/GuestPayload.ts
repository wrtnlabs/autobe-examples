import { tags } from "typia";

export interface GuestPayload {
  /** Primary key of the guest identity record (community_guests.id) */
  id: string & tags.Format<"uuid">;

  /** Primary key of the guest session record (community_guest_sessions.id) */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator — always "guest" for unauthenticated visitors */
  type: "guest";
}
