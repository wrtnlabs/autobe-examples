import { tags } from "typia";

export interface CitizenPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * This is the citizen's ID from economic_board_citizens.
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the citizen's authenticated session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "citizen";
}
