import { tags } from "typia";

export interface RegisteredmemberPayload {
  /** User account ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the registered member user. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "registeredmember";
}
