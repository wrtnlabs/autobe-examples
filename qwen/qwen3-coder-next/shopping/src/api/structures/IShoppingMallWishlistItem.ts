import { tags } from "typia";

import { IShoppingMallProduct } from "./IShoppingMallProduct";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallWishlistItem {
  /**
   * Wishlist item summary containing the wishlist item metadata and product information as it appeared when added to the wishlist.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property product
     */
    product: IShoppingMallProduct.ISummary;
    /**
     * @x-autobe-database-schema-property product
     */
    seller: IShoppingMallSeller.ISummary;
  };

  /**
   * Pagination parameters for customer wishlist listing
   */
  export type IRequest = {
    /**
     * Page number for pagination (1-based)
     *
     * @x-autobe-specification Pagination offset: page number (1-based).
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of items per page (max 100)
     *
     * @x-autobe-specification Pagination limit: maximum number of items per page.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;
  };
}
