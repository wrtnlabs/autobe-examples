import { tags } from "typia";

export interface SellerPayload {
  /** Seller table ID (the primary identifier for the seller account). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "seller";
}
