import { tags } from "typia";

/** Payload for authenticated seller actor (injected by SellerAuth). */
export interface SellerPayload {
  /**
   * Top-level seller table ID (the fundamental seller identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Session ID associated with the seller. */
  session_id: string & tags.Format<"uuid">;

  /** Discriminator for type-safe role identification. */
  type: "seller";
}
