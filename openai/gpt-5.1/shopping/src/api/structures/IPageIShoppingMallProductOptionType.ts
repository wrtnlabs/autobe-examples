import { IPage } from "./IPage";
import { IShoppingMallProductOptionType } from "./IShoppingMallProductOptionType";

export namespace IPageIShoppingMallProductOptionType {
  /**
   * Paginated response containing summary records for product option types
   * associated with a specific product.
   *
   * This schema represents the response body for the PATCH
   * `/shoppingMall/seller/products/{productCode}/optionTypes` endpoint, which
   * retrieves a filtered and paginated list of option type definitions stored
   * in the `shopping_mall_product_option_types` table. It combines generic
   * paging metadata from `IPage.IPagination` with an array of
   * `IShoppingMallProductOptionType.ISummary` objects so that clients can
   * view, search, and manage the option dimensions that drive product
   * variants.
   *
   * Use this DTO whenever you need to provide a page-based view of option
   * type definitions scoped by `productCode`, particularly in seller and
   * administrator tooling that manages complex variant structures and expects
   * stable pagination and ordering behavior.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current product option type search
     * result.
     *
     * This object implements the `IPage.IPagination` structure and captures
     * the state of the option type result set **after** the backend has
     * applied the filter, sort, and page parameters provided in
     * `IShoppingMallProductOptionType.IRequest`. The `current` property
     * identifies the 1-based index of the page that has been returned,
     * `limit` is the maximum number of option type summaries per page,
     * `records` is the total number of option type rows in
     * `shopping_mall_product_option_types` that match the query for the
     * resolved product, and `pages` is the computed total number of pages.
     *
     * Seller back-office UIs and administrator consoles rely on these
     * values to implement consistent pagination when managing option
     * dimensions (such as size, color, or material) for a product
     * identified by `productCode`.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of product option type summary records for the requested
     * page.
     *
     * Each element in this array is an
     * `IShoppingMallProductOptionType.ISummary` instance that corresponds
     * to a single row in the `shopping_mall_product_option_types` table
     * associated with the product resolved from the `productCode` path
     * parameter. A summary typically includes fields such as the option
     * type identifier, its human-readable name, and the display order,
     * which are sufficient for configuration and management UIs to present
     * and rearrange option dimensions.
     *
     * The contents of this array are derived from executing a search
     * defined by `IShoppingMallProductOptionType.IRequest`, including
     * optional filters (for example, by name or active status) and sort
     * directives (such as by display order). When read together with the
     * `pagination` object, this array allows clients to navigate and
     * maintain large sets of option type definitions in a predictable,
     * paginated fashion.
     */
    data: IShoppingMallProductOptionType.ISummary[];
  };
}
