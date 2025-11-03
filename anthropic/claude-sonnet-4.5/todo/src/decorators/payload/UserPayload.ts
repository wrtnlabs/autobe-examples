import { tags } from "typia";

/** Payload for authenticated regular users who manage their personal todo lists. */
export interface UserPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the authenticated user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "user";
}
