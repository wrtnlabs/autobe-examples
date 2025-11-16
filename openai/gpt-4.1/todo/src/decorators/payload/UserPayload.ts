import { tags } from "typia";

/** Payload for authenticated Todo List app user session. */
export interface UserPayload {
  /** Top-level user account ID (uuid) */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the user's current log-in */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for verified union type */
  type: "user";
}
