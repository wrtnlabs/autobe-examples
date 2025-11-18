import { tags } from "typia";

/** Structure of authenticated user payload injected via UserAuth. */
export interface UserPayload {
  /** Top-level user table ID (primary user identifier). */
  id: string & tags.Format<"uuid">;

  /** Session ID for the current authentication session. */
  session_id: string & tags.Format<"uuid">;

  /** Role type discriminator ('user'). */
  type: "user";
}
