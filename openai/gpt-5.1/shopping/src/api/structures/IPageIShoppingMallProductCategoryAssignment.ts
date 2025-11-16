import { IPage } from "./IPage";
import { IShoppingMallProductCategoryAssignment } from "./IShoppingMallProductCategoryAssignment";

export namespace IPageIShoppingMallProductCategoryAssignment {
  /**
   * Paginated response wrapper for product–category assignment summaries
   * associated with a specific product.
   *
   * This type exposes standard pagination metadata (`IPage.IPagination`)
   * alongside an array of `IShoppingMallProductCategoryAssignment.ISummary`
   * records, each representing a single link between a product and a category
   * node in the catalog hierarchy. It is used by seller and platform-admin
   * endpoints that list category assignments for a product, enabling UIs to
   * render current taxonomy placement with proper paging, sorting, and
   * filtering behavior.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of product–category assignments.
     *
     * This property uses the shared `IPage.IPagination` shape to report the
     * current page index, page size, total number of assignment records,
     * and total page count. It allows seller tools and admin consoles to
     * iterate through category assignments for a given product in a
     * predictable, consistent way across the shoppingMall platform.
     */
    pagination: IPage.IPagination;

    /**
     * List of product–category assignment summaries for the current page.
     *
     * Each entry is an `IShoppingMallProductCategoryAssignment.ISummary`
     * object describing how a single product is linked to a particular
     * category node (including whether the assignment is primary) based on
     * rows from the `shopping_mall_product_category_assignments` table and
     * related `shopping_mall_categories` data. This list is returned by
     * endpoints such as
     * `/shoppingMall/seller/products/{productCode}/categories` and
     * `/shoppingMall/platformAdmin/products/{productCode}/categories` so
     * that users can inspect and manage the taxonomy placement of a chosen
     * product.
     */
    data: IShoppingMallProductCategoryAssignment.ISummary[];
  };
}
