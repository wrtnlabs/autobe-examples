import { IPage } from "./IPage";
import { IShoppingMallBrand } from "./IShoppingMallBrand";

export namespace IPageIShoppingMallBrand {
  /**
   * Paginated collection of brand summary records from the shopping mall
   * catalog.
   *
   * This schema combines `IPage.IPagination` with an array of
   * `IShoppingMallBrand.ISummary` items to represent a single page of results
   * returned by brand search endpoints such as `/shoppingMall/brands`. It is
   * designed for use in storefront and administrative UIs that need to
   * display lists or grids of brands backed by the `shopping_mall_brands`
   * Prisma model, supporting efficient browsing, filtering, and
   * infinite-scroll style interactions over the full brand catalog.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window over the brand
     * catalog.
     *
     * This object follows the `IPage.IPagination` structure and exposes
     * fields such as current page index, page size, total number of
     * matching brands, and total number of pages. Storefront and
     * administrative UIs use these values to build paging controls when
     * browsing brands from the `shopping_mall_brands` table.
     */
    pagination: IPage.IPagination;

    /**
     * List of brand summary records included in the current page.
     *
     * Each element is an `IShoppingMallBrand.ISummary` DTO that provides
     * lightweight information about a single brand, such as its identifier,
     * display name, and key visual elements like logo image URLs. This
     * collection is used by brand listing views in the catalog, enabling
     * users to scan, filter, and select brands without loading full brand
     * detail payloads for every record.
     */
    data: IShoppingMallBrand.ISummary[];
  };
}
