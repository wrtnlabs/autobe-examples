import { tags } from "typia";

export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the user session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for user role type. */
  type: "user";
}
