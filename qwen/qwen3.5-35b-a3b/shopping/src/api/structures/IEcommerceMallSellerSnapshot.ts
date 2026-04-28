import { tags } from "typia";

export namespace IEcommerceMallSellerSnapshot {
  /**
   * Immutable audit trail snapshot of a seller's shop profile, capturing the complete shop identity at the time of modification.
   *
   * **Purpose**:
   * This snapshot preserves the seller's shop name, description, and logo as they existed when a product modification occurred. It enables historical reconstruction of which seller operated the shop at a specific point in time, supporting compliance audits, dispute resolution, and product attribution.
   *
   * **Fields**:
   * - `id`: Unique identifier for the snapshot record
   * - `shop_name`: The public-facing shop name displayed to customers at snapshot time
   * - `shop_description`: The business description and policies as they existed when captured
   * - `shop_logo`: The logo image URL visible in product listings and communications
   * - `created_at`: Timestamp of the modification that triggered this snapshot capture
   *
   * **Usage**:
   * Referenced from `IEcommerceMallProductSnapshot.sellerSnapshot` to provide historical seller context for product changes. Each snapshot is immutable and append-only, ensuring audit trail integrity.
   */
  export type ISummary = {
    /**
     * Primary key identifier for this shop profile snapshot record.
     *
     * Uniquely identifies the audit trail snapshot within the platform's compliance records. Used to reference this specific historical state of the shop profile for retrieval, auditing, and dispute resolution purposes.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_snapshots.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The seller's shop name as it was publicly displayed when this snapshot was created.
     *
     * This field preserves the exact shop name shown to customers in product listings, order confirmations, and customer-facing pages at the time of the modification. It remains constant even if the seller later updates their shop name, enabling accurate historical attribution of products and transactions.
     *
         * @x-autobe-database-schema-property shop_name
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_snapshots.shop_name. Required string field.
     */
    shop_name: string;

    /**
     * The seller's shop description and business information as it existed when this snapshot was captured.
     *
     * This preserved description includes background information about the seller's business, product offerings, policies, and other details displayed to customers. The text enables historical understanding of the seller's positioning and value proposition at the snapshot point in time.
     *
         * @x-autobe-database-schema-property shop_description
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_snapshots.shop_description. Required string
         *   field.
     */
    shop_description: string;

    /**
     * The URL of the seller's shop logo image at the time this snapshot was created, or null if no logo was set.
     *
     * This field preserves the visual brand identity that appeared in product listings, seller profiles, and order-related communications when the snapshot was captured. When null, the shop profile had no logo at that point in time.
     *
         * @x-autobe-database-schema-property shop_logo
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_snapshots.shop_logo. Nullable string field
         *   with max 80000 character length.
     */
    shop_logo: string | null;

    /**
     * The timestamp when this shop profile snapshot was created, marking the exact point in time when the modification occurred.
     *
     * This immutable timestamp represents when the snapshot was captured and preserved. It is used for chronological tracking of profile changes, audit trail reconstruction, and determining the temporal context of historical data.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_snapshots.created_at. ISO 8601 date-time
         *   format.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
