import { tags } from "typia";

import { IShoppingMallCategory } from "./IShoppingMallCategory";
import { IShoppingMallProduct } from "./IShoppingMallProduct";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallProductSnapshot {
  /**
   * Lightweight product snapshot for listing and pagination. Contains essential identifying information while excluding large text content. Includes relationships to original product, seller, and category as summaries.
   */
  export type ISummary = {
    /**
     * Unique snapshot identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Product name at the time of snapshot.
     *
     * @x-autobe-database-schema-property name
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.name.
     */
    name: string;

    /**
     * Base price at the time of snapshot.
     *
     * @x-autobe-database-schema-property base_price
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.base_price.
     */
    base_price: number;

    /**
     * Product deletion status at the time of snapshot.
     *
     * @x-autobe-database-schema-property is_deleted
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.is_deleted.
     */
    is_deleted: boolean;

    /**
     * Deletion timestamp if product was deleted at time of snapshot.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.deleted_at.
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Snapshot creation timestamp for ordering and versioning.
     *
     * @x-autobe-database-schema-property snapshot_timestamp
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.snapshot_timestamp.
     */
    snapshot_timestamp: string & tags.Format<"date-time">;

    /**
     * Version number for tracking multiple snapshots of the same product.
     *
     * @x-autobe-database-schema-property snapshot_version
     * @x-autobe-specification Direct mapping from shopping_mall_product_snapshots.snapshot_version.
     */
    snapshot_version: number & tags.Type<"int32">;

    /**
     * The original product that was snapshotted.
     *
     * @x-autobe-database-schema-property originalProduct
     * @x-autobe-specification Join from shopping_mall_product_snapshots.shopping_mall_product_id to shopping_mall_products.id. Returns ISummary.
     */
    originalProduct: IShoppingMallProduct.ISummary;

    /**
     * The seller who created the product at time of snapshot.
     *
     * @x-autobe-database-schema-property seller
     * @x-autobe-specification Join from shopping_mall_product_snapshots.shopping_mall_seller_id to shopping_mall_sellers.id. Returns ISummary.
     */
    seller: IShoppingMallSeller.ISummary;

    /**
     * The category at the time of snapshot.
     *
     * @x-autobe-database-schema-property category
     * @x-autobe-specification Join from shopping_mall_product_snapshots.shopping_mall_category_id to shopping_mall_categories.id. Returns ISummary.
     */
    category: IShoppingMallCategory.ISummary;
  };
}
