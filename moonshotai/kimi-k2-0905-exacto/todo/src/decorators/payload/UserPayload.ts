import { tags } from "typia";

export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID for the current authentication session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "user";
}
