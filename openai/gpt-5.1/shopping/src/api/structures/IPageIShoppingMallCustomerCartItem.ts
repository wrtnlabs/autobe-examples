import { IPage } from "./IPage";
import { IShoppingMallCustomerCartItem } from "./IShoppingMallCustomerCartItem";

export namespace IPageIShoppingMallCustomerCartItem {
  /**
   * Paginated collection of customer cart item summaries for a specific
   * persistent customer cart.
   *
   * This page wrapper is returned by the cart item listing endpoints that
   * operate over the `shopping_mall_customer_cart_items` Prisma model (for
   * example, `PATCH
   * /shoppingMall/customer/customerCarts/{customerCartId}/items` and the
   * corresponding platform-admin variant). The `customerCartId` path
   * parameter identifies the parent `shopping_mall_customer_carts` record,
   * while this schema provides the paginated set of item summaries within
   * that cart.
   *
   * The `pagination` property exposes standard page information such as the
   * current page index, page size, total matching items, and total pages,
   * enabling UIs to implement efficient paging and navigation. The `data`
   * array contains the actual `IShoppingMallCustomerCartItem.ISummary`
   * records used to render cart item lists, including SKU references,
   * quantities, and pricing snapshots.
   *
   * This type is read-only and is not used for creation or update operations.
   * It exists purely as a response envelope that combines cart item summaries
   * with pagination metadata for list-style views of a customer's cart
   * contents.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of customer cart items.
     *
     * This object follows the shared `IPage.IPagination` schema and
     * describes which page of results is being returned, how many records
     * are included per page, the total number of matching cart items, and
     * the total number of pages available for the current filter set.
     *
     * Client applications use this information together with the original
     * `IShoppingMallCustomerCartItem.IRequest` search criteria to drive
     * paging controls, compute “showing X–Y of Z items” messages, and
     * decide whether to request additional pages.
     */
    pagination: IPage.IPagination;

    /**
     * Array of customer cart item summaries for the requested page.
     *
     * Each entry in this array is an
     * `IShoppingMallCustomerCartItem.ISummary` object that represents a
     * single line item derived from the `shopping_mall_customer_cart_items`
     * Prisma table and its related catalog entities. The records are scoped
     * to a single persistent customer cart identified by the
     * `customerCartId` path parameter used in the corresponding PATCH
     * endpoints.
     *
     * The array may be empty when the cart contains no items or when no
     * items match the applied filters (such as SKU code, creation time
     * window, or status). Clients should treat an empty array as “no items
     * on this page” rather than an error condition.
     */
    data: IShoppingMallCustomerCartItem.ISummary[];
  };
}
