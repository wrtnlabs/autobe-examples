import { tags } from "typia";

export interface GuestPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * Since guests are unauthenticated, we can use a placeholder UUID.
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with the guest user. Guests typically don't have
   * session IDs, so a placeholder UUID is used.
   */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "guest";
}
