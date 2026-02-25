import { tags } from "typia";

export namespace IShoppingMallOrderSellerProfileSnapshots {
  /**
   * Summary view of a seller profile at the time of order purchase, containing essential information needed to identify the seller and their shop status during that transaction.
   */
  export type ISummary = {
    /**
     * Unique identifier for the seller profile snapshot record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_order_seller_profile_snapshots.id. Primary key identifying the snapshot record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Seller's shop name as it appeared at the time of order purchase.
     *
     * @x-autobe-database-schema-property shop_name
     * @x-autobe-specification Direct mapping from shopping_mall_order_seller_profile_snapshots.shop_name. Denormalized copy of shop name at time of snapshot.
     */
    shop_name: string;

    /**
     * URL to the seller's logo image as it appeared at the time of order purchase. Null if no logo was set.
     *
     * @x-autobe-database-schema-property logo_image_url
     * @x-autobe-specification Direct mapping from shopping_mall_order_seller_profile_snapshots.logo_image_url. Nullable field containing URL to seller's logo image.
     */
    logo_image_url?: string | null | undefined;

    /**
     * Seller's approval status at the time of order purchase (pending, approved, or rejected).
     *
     * @x-autobe-database-schema-property approval_status
     * @x-autobe-specification Direct mapping from shopping_mall_order_seller_profile_snapshots.approval_status. Denormalized copy of approval status at time of snapshot.
     */
    approval_status: string;
  };
}
