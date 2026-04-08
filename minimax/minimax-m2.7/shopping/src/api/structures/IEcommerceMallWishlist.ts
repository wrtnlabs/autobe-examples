import { tags } from "typia";

import { IEcommerceMallCustomer } from "./IEcommerceMallCustomer";
import { IEcommerceMallWishlistItem } from "./IEcommerceMallWishlistItem";

export namespace IEcommerceMallWishlist {
  /**
   * Request parameters for retrieving a customer's wishlist with pagination cursor and optional product name filtering.
   */
  export type IRequest = {
    /**
     * Pagination cursor token to retrieve the next page of wishlist items.
     *
     * @x-autobe-specification Pagination cursor token for cursor-based navigation through wishlist items. Format: base64 encoded wishlist item ID from previous response. When provided, returns wishlist items created after this item. Used for efficient pagination without offset calculations.
     */
    cursor?: string | undefined;

    /**
     * Maximum number of wishlist items to return per page.
     *
     * @x-autobe-specification Maximum number of wishlist items to return per page. Default: 20. Maximum: 100. When limit exceeds maximum, cap at 100.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Optional filter to search wishlist items by product name (case-insensitive partial match).
     *
     * @x-autobe-specification Case-insensitive partial match filter applied to product name via LEFT JOIN with ecommerce_mall_products table. Filters wishlist items to only those where the associated product name contains the provided search term.
     */
    name?: string | undefined;

    /**
     * Target page number to retrieve (1-indexed). Defaults to page 1.
     *
     * @x-autobe-specification 1-indexed page number for offset-based pagination. Defaults to 1 if not provided. Combined with limit to calculate offset: (page - 1) * limit. Can be used alongside cursor for hybrid pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary representation of a customer's wishlist containing saved product items.
   */
  export type ISummary = {
    createdAt: string & tags.Format<"date-time">;
    customer: IEcommerceMallCustomer.ISummary;
    id: string & tags.Format<"uuid">;
    wishlistItems: IEcommerceMallWishlistItem.ISummary[];
  };
}
