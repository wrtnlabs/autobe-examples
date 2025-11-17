import { tags } from "typia";

export interface RegistereduserPayload {
  /** Top-level registered user ID (UUID format). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the registered user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the registered user role. */
  type: "registereduser";
}
