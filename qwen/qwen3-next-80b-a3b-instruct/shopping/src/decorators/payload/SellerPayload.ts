import { tags } from "typia";

export interface SellerPayload {
  /**
   * Top-level user table ID (the fundamental user identifier in the system).
   * This is the ID of the user entity that owns the seller account.
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the seller's current authentication session. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "seller";
}
