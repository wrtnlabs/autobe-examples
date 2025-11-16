import { IPage } from "./IPage";
import { IShoppingMallProductVisibilityRule } from "./IShoppingMallProductVisibilityRule";

export namespace IPageIShoppingMallProductVisibilityRule {
  /**
   * Paginated collection of product visibility rule summaries for a specific
   * catalog product.
   *
   * This DTO wraps a page of `IShoppingMallProductVisibilityRule.ISummary`
   * records based on the `shopping_mall_product_visibility_rules` Prisma
   * model, scoped to the product indicated by the API path parameter (for
   * example, `/shoppingMall/seller/products/{productCode}/visibilityRules` or
   * `/shoppingMall/platformAdmin/products/{productCode}/visibilityRules`). It
   * is used by seller back offices and platform administrator consoles to
   * inspect and manage the visibility configuration that controls where a
   * product appears in the storefront.
   *
   * The `pagination` object conveys paging metadata for the result set, while
   * the `data` array contains the actual visibility rule summaries for the
   * current page, already filtered and sorted according to criteria supplied
   * in the corresponding `IShoppingMallProductVisibilityRule.IRequest` search
   * payload.
   */
  export type ISummary = {
    /**
     * Pagination information for the current slice of product visibility
     * rules.
     *
     * Contains the page index, page size, total record count, and total
     * page count for the `shopping_mall_product_visibility_rules` records
     * that match the search filters applied to the product identified by
     * `productCode`. Administrative and seller tools use this data to drive
     * paging controls when browsing visibility configuration for a catalog
     * product.
     */
    pagination: IPage.IPagination;

    /**
     * List of product visibility rule summaries in the current page.
     *
     * Each element is an `IShoppingMallProductVisibilityRule.ISummary` DTO
     * that summarizes a single row from the
     * `shopping_mall_product_visibility_rules` Prisma model, optionally
     * linked to a region configuration entry in
     * `shopping_mall_region_settings`. The collection reflects the rules
     * that determine where and how the referenced product is visible across
     * regions and channels after applying the request’s filters and sort
     * order.
     */
    data: IShoppingMallProductVisibilityRule.ISummary[];
  };
}
