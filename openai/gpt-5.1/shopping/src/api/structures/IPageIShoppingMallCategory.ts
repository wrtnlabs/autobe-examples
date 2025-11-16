import { IPage } from "./IPage";
import { IShoppingMallCategory } from "./IShoppingMallCategory";

export namespace IPageIShoppingMallCategory {
  /**
   * Paginated collection of category summary records returned from catalog
   * category search operations.
   *
   * This schema wraps `IShoppingMallCategory.ISummary` items together with
   * standard `IPage.IPagination` metadata so that clients can reliably page
   * through potentially large category hierarchies. It is used as the
   * response body for endpoints such as
   * `/shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories`
   * and `/shoppingMall/search/categories`, where the request body is an
   * `IShoppingMallCategory.IRequest` describing filters, sort options, and
   * paging preferences.
   *
   * The `pagination` field exposes high‑level paging information (current
   * page, page size, total records, and total pages), while the `data` array
   * carries the actual category summary rows for that page. This separation
   * allows frontends to render list views of categories and build pagination
   * controls without re‑deriving counts from the raw result set.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of category results
     * returned by the server.
     *
     * This object follows the `IPage.IPagination` schema and includes
     * fields such as the current page index, the maximum number of records
     * per page, the total number of records matching the filter criteria,
     * and the total number of pages that can be navigated.
     *
     * Client applications use this information to implement paging controls
     * (for example, next/previous page buttons) and to construct subsequent
     * search requests with updated `page` and `limit` values in
     * `IShoppingMallCategory.IRequest`.
     */
    pagination: IPage.IPagination;

    /**
     * Array of category summary records for the current page of results.
     *
     * Each element is an `IShoppingMallCategory.ISummary` DTO representing
     * a single category node from the `shopping_mall_categories` Prisma
     * model, including human‑readable fields such as the category name,
     * slug, full path, and a summary of the owning category tree.
     *
     * This collection contains only the categories for the page described
     * by the `pagination` object. Its length is less than or equal to
     * `pagination.limit`, and when combined with `pagination.records` it
     * allows clients to understand how many additional pages of category
     * data remain to be fetched.
     */
    data: IShoppingMallCategory.ISummary[];
  };
}
