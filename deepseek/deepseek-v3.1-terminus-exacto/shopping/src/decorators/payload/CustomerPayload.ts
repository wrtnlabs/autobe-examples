import { tags } from "typia";

export interface CustomerPayload {
  /**
   * Top-level customer table ID (the fundamental customer identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the customer. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "customer";
}
