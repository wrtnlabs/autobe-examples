import { tags } from "typia";

/** JWT payload for unauthenticated/guest session user. ID is the guest.id PK. */
export interface GuestPayload {
  /** Guest ID (top-level guest unique identifier). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for unauthenticated/guest JWTs. */
  type: "guest";
}
