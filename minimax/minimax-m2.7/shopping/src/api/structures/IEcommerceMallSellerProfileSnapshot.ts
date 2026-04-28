import { tags } from "typia";

export namespace IEcommerceMallSellerProfileSnapshot {
  /**
   * Summary representation of a seller profile snapshot.
   *
   * Contains the shop name, description, and logo URL as they appeared at the time the snapshot was captured. Each snapshot represents a point-in-time record of the shop profile when edits occurred.
   *
   * Use cases:
   * - Sellers viewing their profile change history
   * - Historical reference for dispute resolution
   * - Audit trail of shop information changes
   */
  export type ISummary = {
    /**
     * Unique identifier for the snapshot record.
     *
     * This UUID uniquely identifies each snapshot in the system. Use this identifier when retrieving specific snapshots or referencing them in related operations.
     *
         * @x-autobe-database-schema-property id
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_profile_snapshots.id. UUID primary key.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Shop name at the time of snapshot creation.
     *
     * This field preserves the exact shop name as it appeared when the snapshot was captured, allowing historical tracking of name changes over time.
     *
         * @x-autobe-database-schema-property shop_name
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_profile_snapshots.shop_name. String.
     */
    shopName: string;

    /**
     * Shop business description at the time of snapshot creation.
     *
     * Null if no description was provided at the time of snapshot.
     *
     * Use this to track how the shop's business description evolved over time.
     *
         * @x-autobe-database-schema-property shop_description
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_profile_snapshots.shop_description. Nullable
         *   string.
     */
    shopDescription: string | null;

    /**
     * Shop logo image URL at the time of snapshot creation.
     *
     * Null if no logo was set at the time of snapshot.
     *
     * This URL references the logo image as it appeared when the snapshot was captured.
     *
         * @x-autobe-database-schema-property logo_url
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_profile_snapshots.logo_url. Nullable string.
     */
    logoUrl: string | null;

    /**
     * Timestamp when this snapshot was created, capturing the shop profile state at this point in time.
     *
     * This timestamp indicates when the snapshot was automatically created, either during a profile edit or when an order was placed. Use this to establish chronological order of profile changes.
     *
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_seller_profile_snapshots.created_at. DateTime stored
         *   as ISO 8601 string.
     */
    createdAt: string & tags.Format<"date-time">;
  };
}
