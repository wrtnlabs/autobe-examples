import { tags } from "typia";

export interface CustomerPayload {
  /**
   * Top-level customer account ID (the fundamental user identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the customer actor. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "customer";
}
