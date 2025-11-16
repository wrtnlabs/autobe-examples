import { IPage } from "./IPage";
import { IShoppingMallCartItem } from "./IShoppingMallCartItem";

export namespace IPageIShoppingMallCartItem {
  /**
   * Paginated response wrapper for shopping cart item summaries.
   *
   * This response type encapsulates a page of shopping cart item results
   * along with pagination metadata. It follows the standard pagination
   * pattern used throughout the API, providing both the data payload and the
   * navigation information needed to browse through multiple pages of cart
   * contents.
   *
   * Shopping cart items represent products that authenticated buyers have
   * added to their carts with the intent to purchase. Each cart item links a
   * specific product SKU variant to a buyer along with the desired quantity.
   * The cart persists across sessions, allowing buyers to accumulate items
   * over time before proceeding to checkout.
   *
   * The pagination structure contains two primary components: the
   * `pagination` metadata object providing navigation information (current
   * page, total items in cart, total pages, items per page), and the `data`
   * array containing lightweight summary representations of cart items for
   * the current page. This separation enables efficient cart display while
   * maintaining complete pagination state for large carts.
   *
   * This paginated response is returned by cart search and retrieval
   * operations, enabling buyers to view, filter, and manage their shopping
   * cart contents. The underlying data comes from the
   * shopping_mall_cart_items table in the Prisma schema. The summary format
   * includes essential cart item information without excessive detail,
   * optimized for cart list displays.
   *
   * Typical use cases include displaying the buyer's current cart contents
   * with product details and pricing, filtering cart items by category or
   * price range to help buyers organize large carts, sorting items by various
   * criteria such as date added or price, and implementing search
   * functionality to help buyers quickly find specific items within their
   * cart.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the shopping cart item result set.
     *
     * Provides essential pagination information including current page
     * number, page size limit, total record count, and total pages. This
     * metadata enables buyers to navigate through their cart contents
     * efficiently, especially important for buyers with large carts
     * containing many items.
     */
    pagination: IPage.IPagination;

    /**
     * Array of shopping cart item summaries matching the search and filter
     * criteria.
     *
     * Contains lightweight cart item representations for the current page,
     * with each element including essential product information, quantity,
     * and pricing. The array size is constrained by the pagination limit
     * parameter and may be empty if no items match the specified filters or
     * if the cart is empty.
     */
    data: IShoppingMallCartItem.ISummary[];
  };
}
