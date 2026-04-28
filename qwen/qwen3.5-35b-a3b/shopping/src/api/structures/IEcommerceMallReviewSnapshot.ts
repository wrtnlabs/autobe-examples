import { tags } from "typia";

import { IEcommerceMallOrderItem } from "./IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "./IEcommerceMallProduct";

export namespace IEcommerceMallReviewSnapshot {
  /**
   * Snapshot summary of a product review at a point in time.
   *
   * Contains essential snapshot information including the star rating, text content, version number, and creation timestamp. Used in paginated lists displaying review history.
   *
   * ### Relations
   *
   * - `{@link IEcommerceMallOrderItem.ISummary}` — The order item that was reviewed (order context)
   * - `{@link IEcommerceMallProduct.ISummary}` — The product that was reviewed (product context)
   */
  export type ISummary = {
    /**
         * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
         * @x-autobe-database-schema-property rating
     */
    rating: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;

    /**
     * Review text content at the time of this snapshot.
     *
     * Optional text feedback provided by the customer. May be null if the customer only submitted a star rating without text.
     *
     * **Note**: This field is nullable to match the database schema, where reviews can exist with only ratings and no text content.
     *
         * @x-autobe-database-schema-property review_text
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_review_snapshots.review_text. Nullable: allows null
         *   values when review has no text content.
     */
    review_text: string | null;
    /**
         * @x-autobe-database-schema-property version
     */
    version: number & tags.Type<"int32"> & tags.Minimum<1>;
    /**
         * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
         * @x-autobe-database-schema-property orderItem
     */
    orderItem: IEcommerceMallOrderItem.ISummary;
    /**
         * @x-autobe-database-schema-property product
     */
    product: IEcommerceMallProduct.ISummary;
  };
}
