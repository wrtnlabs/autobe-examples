import { IPage } from "./IPage";
import { IShoppingMallCatalogSearchResult } from "./IShoppingMallCatalogSearchResult";

export namespace IPageIShoppingMallCatalogSearchResult {
  /**
   * Paginated collection of catalog search result summaries produced by an
   * advanced product search.
   *
   * This page DTO is the standard response envelope for operations like
   * `/shoppingMall/catalog/search`, where the backend composes results from
   * `shopping_mall_products`, `shopping_mall_product_skus`,
   * `shopping_mall_categories`, `shopping_mall_brands`, and associated
   * visibility and compliance configuration tables. The `pagination` field
   * describes the current position within the result set, while `data`
   * contains the `IShoppingMallCatalogSearchResult.ISummary` records that
   * represent individual products in a form tailored for list and grid
   * views.
   *
   * Clients use this structure to power the main product discovery
   * experiences in the shoppingMall platform. It supports features such as
   * faceted navigation, keyword search, regional filtering, and sorting by
   * relevance or price, while keeping network payloads compact and uniform
   * across different catalog entry points. The separation between this page
   * wrapper and the underlying item summary schema allows the platform to
   * evolve search result contents without changing the pagination contract
   * itself.
   */
  export type ISummary = {
    /**
     * Pagination information for the current catalog search result set.
     *
     * This property follows the shared `IPage.IPagination` contract and
     * exposes the current page index, requested page size, total number of
     * matched products, and derived total page count. It enables clients to
     * implement paginated catalog views, infinite scrolling, or
     * page-numbered navigation on top of the `/shoppingMall/catalog/search`
     * endpoint.
     */
    pagination: IPage.IPagination;

    /**
     * Array of catalog search result summary entries for the current page.
     *
     * Each item is an `IShoppingMallCatalogSearchResult.ISummary` object
     * that combines key information from products, SKUs, categories,
     * brands, and visibility/compliance layers into a compact
     * representation suitable for search result cards. These summaries are
     * intentionally lightweight so that high-traffic discovery
     * surfaces—such as global search boxes, category listing pages, and
     * filter panels—can render quickly while deferring full product detail
     * retrieval to dedicated endpoints.
     */
    data: IShoppingMallCatalogSearchResult.ISummary[];
  };
}
