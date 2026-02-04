import { tags } from "typia";

export interface GuestPayload {
  /** The unique identifier for the guest session in the database. */
  id: string & tags.Format<"uuid">;

  /** The session identifier associated with this guest access. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the role type in the JWT payload. */
  type: "guest";
}
