import { tags } from "typia";

export interface GuestPayload {
  /** Top-level guest ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the guest's authentication session */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the role type */
  type: "guest";
}
