import { tags } from "typia";

export interface SellerPayload {
  /**
   * Top-level seller table ID (the fundamental seller identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the seller. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "seller";
}
