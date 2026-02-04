import { tags } from "typia";

export interface CitizenPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   */
  id: string & tags.Format<"uuid">;

  /**
   * Session ID associated with the citizen user.
   */
  session_id: string & tags.Format<"uuid">;

  /**
   * Discriminator for the discriminated union type.
   */
  type: "citizen";
}
