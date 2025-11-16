import { tags } from "typia";

export interface SellerPayload {
  /** Top-level seller user ID. */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the seller. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator type for seller role. */
  type: "seller";
}
