import { IPage } from "./IPage";
import { IShoppingMallCategoryTree } from "./IShoppingMallCategoryTree";

export namespace IPageIShoppingMallCategoryTree {
  /**
   * Paginated collection of category tree summaries used to manage catalog
   * structures in the shopping mall platform.
   *
   * This schema represents the response body of list and search operations
   * over the `shopping_mall_category_trees` table, such as the PATCH
   * `/shoppingMall/platformAdmin/categoryTrees` endpoint. It combines generic
   * pagination information with an array of
   * `IShoppingMallCategoryTree.ISummary` elements so that platform
   * administrators can browse and manage logical catalog trees (for example,
   * main storefront trees or region-specific hierarchies).
   *
   * By using a dedicated page wrapper, the API ensures a consistent response
   * pattern across catalog-related endpoints, allowing client applications to
   * reuse table components, data grids, and selection dialogs while relying
   * on a clear separation between pagination metadata (`pagination`) and the
   * actual category tree summary records (`data`).
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of category tree
     * search results.
     *
     * This object follows the shared `IPage.IPagination` contract and
     * includes fields such as the current page index, page size, total
     * number of matching category trees, and total page count. Admin UIs
     * and configuration tools use these values to render navigation
     * controls, determine whether additional pages are available, and
     * understand the size of the `shopping_mall_category_trees` result set
     * for the active filters.
     */
    pagination: IPage.IPagination;

    /**
     * List of category tree summary records for the requested page.
     *
     * Each element is an `IShoppingMallCategoryTree.ISummary` object that
     * provides a compact view of a record from the
     * `shopping_mall_category_trees` Prisma model, including key
     * identifiers such as `id`, `code`, `name`, and `active` status. These
     * summaries are optimized for administrative list views, where
     * operators need to quickly scan available trees and select one for
     * further inspection or editing.
     *
     * The array may contain zero or more items depending on the filters
     * provided in `IShoppingMallCategoryTree.IRequest`. Even when empty,
     * the property is always present so that clients can reliably iterate
     * over the `data` field without additional null checks.
     */
    data: IShoppingMallCategoryTree.ISummary[];
  };
}
