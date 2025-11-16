import { tags } from "typia";

/**
 * SellerPayload
 *
 * Payload injected for authenticated sellers.
 */
export interface SellerPayload {
  /** Seller's unique account id (UUID primary key) */
  id: string & tags.Format<"uuid">;

  /** Session identifier (UUID referencing a session row) */
  session_id: string & tags.Format<"uuid">;

  /** Actor type discriminator */
  type: "seller";
}
