import { IPage } from "./IPage";
import { IShoppingMallProductMedia } from "./IShoppingMallProductMedia";

export namespace IPageIShoppingMallProductMedia {
  /**
   * Paginated response containing summary records for product media assets of
   * a specific product.
   *
   * This schema models the response body for the PATCH
   * `/shoppingMall/products/{productCode}/media` operation, which searches
   * and retrieves product media entries stored in the
   * `shopping_mall_product_media` table. It combines general pagination
   * metadata from `IPage.IPagination` with an array of
   * `IShoppingMallProductMedia.ISummary` records so that clients can both
   * render the current page of product media and understand the overall
   * result size.
   *
   * Use this DTO whenever you need to return a page of product media
   * summaries scoped by a product’s business code, such as for product detail
   * views that paginate gallery images or administrative tools that allow
   * sellers and operators to review, sort, and manage media assets for a
   * catalog product.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current product media search result.
     *
     * This object follows the `IPage.IPagination` contract and represents
     * the paging state **after** the backend has applied all filters,
     * sorting options, and page controls specified in
     * `IShoppingMallProductMedia.IRequest`. The `current` field indicates
     * the 1-based page index that was returned, `limit` is the maximum
     * number of media summary records per page, `records` is the total
     * number of matching product media records for the resolved product
     * across all pages, and `pages` is the total number of pages derived
     * from `records` and `limit`.
     *
     * Client applications use these values to render pagination controls
     * when browsing media assets associated with a specific product
     * identified by `productCode`, ensuring consistent navigation across
     * the product media gallery or management screens.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of product media summary records for the requested page.
     *
     * Each element in this array is an `IShoppingMallProductMedia.ISummary`
     * object that represents a single row from the
     * `shopping_mall_product_media` table linked to the product resolved
     * from the `productCode` path parameter. These summaries expose key
     * fields such as the media identifier, URI, media type, primary flag,
     * and display order so that UIs can render product galleries and media
     * management lists efficiently without fetching full entity details.
     *
     * The records contained here are the result of executing a search based
     * on `IShoppingMallProductMedia.IRequest` (for example, by media type,
     * visibility flags, or creation date range) and are ordered according
     * to the sort options defined in that request. When combined with the
     * `pagination` object, this array allows clients to traverse large sets
     * of media assets in a predictable, page-based manner.
     */
    data: IShoppingMallProductMedia.ISummary[];
  };
}
