import { IPage } from "./IPage";
import { IShoppingMallProduct } from "./IShoppingMallProduct";

export namespace IPageIShoppingMallProduct {
  /**
   * Paginated response wrapper for product summary records in the
   * shoppingMall catalog.
   *
   * This type combines platform-standard pagination metadata
   * (`IPage.IPagination`) with an array of `IShoppingMallProduct.ISummary`
   * entries, each summarizing a product stored in the
   * `shopping_mall_products` Prisma model. It is used as the response body
   * for product search and listing operations, enabling clients to render
   * catalog grids or lists while also knowing how many records exist in total
   * and how to fetch subsequent pages.
   */
  export type ISummary = {
    /**
     * Pagination metadata for this page of product summaries.
     *
     * This property follows the shared `IPage.IPagination` structure used
     * across the shoppingMall platform, providing information such as the
     * current page index, page size, total number of product records, and
     * total page count. Clients rely on this metadata to drive list
     * navigation controls, infinite scrolling, and page-based fetching for
     * catalog views that are backed by the `shopping_mall_products` Prisma
     * model.
     */
    pagination: IPage.IPagination;

    /**
     * List of product summary records for the current page.
     *
     * Each element is an `IShoppingMallProduct.ISummary` object that
     * represents a single product row sourced primarily from the
     * `shopping_mall_products` table, enriched with lightweight brand,
     * media, and rating information appropriate for list or grid views.
     * This collection is used by search endpoints such as
     * `/shoppingMall/products` and
     * `/shoppingMall/catalog/products/enriched` to present catalog results,
     * while more detailed product information is available through separate
     * detail endpoints when needed.
     */
    data: IShoppingMallProduct.ISummary[];
  };
}
