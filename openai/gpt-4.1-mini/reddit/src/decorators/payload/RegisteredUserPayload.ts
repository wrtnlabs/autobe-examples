import { tags } from "typia";

export interface RegisteredUserPayload {
  /** Top-level user ID in the registered users table. */
  id: string & tags.Format<"uuid">;

  /** Session ID for the current user session. */
  session_id: string & tags.Format<"uuid">;

  /** Role discriminator. */
  type: "registeredUser";
}
