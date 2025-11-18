import { tags } from "typia";

export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the role type. */
  type: "user";
}
