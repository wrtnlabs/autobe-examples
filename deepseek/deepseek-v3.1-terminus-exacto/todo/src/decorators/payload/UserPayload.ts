import { tags } from "typia";

/** JWT Payload for authenticated todo list users. */
export interface UserPayload {
  /** Top-level unique user identifier. */
  id: string & tags.Format<"uuid">;
  /** Session identifier for the user's login session. */
  session_id: string & tags.Format<"uuid">;
  /** Discriminator for the user actor type. */
  type: "user";
}
