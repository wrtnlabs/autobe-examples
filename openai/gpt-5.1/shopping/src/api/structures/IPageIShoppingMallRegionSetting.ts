import { IPage } from "./IPage";
import { IShoppingMallRegionSetting } from "./IShoppingMallRegionSetting";

export namespace IPageIShoppingMallRegionSetting {
  /**
   * Paginated collection of region configuration summaries for administrative
   * search results.
   *
   * This DTO is used as the response body for the PATCH
   * `/shoppingMall/platformAdmin/regionSettings` endpoint. It combines
   * pagination metadata with an array of
   * `IShoppingMallRegionSetting.ISummary` records, giving platform
   * administrators a concise view of configured regions backed by the
   * `shopping_mall_region_settings` Prisma model.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the region settings index.
     *
     * The `IPage.IPagination` structure describes the page window over
     * region configuration entries, including the current page index, the
     * maximum number of region summaries per page, the total count of
     * matching region records, and the total computed page count based on
     * the `shopping_mall_region_settings` table.
     */
    pagination: IPage.IPagination;

    /**
     * List of region configuration summary records for the current page.
     *
     * Each element is an `IShoppingMallRegionSetting.ISummary` DTO that
     * captures the primary identifying fields of a region configuration,
     * such as its business code, human-readable name, and active flag,
     * sourced from the `shopping_mall_region_settings` Prisma model. These
     * summaries are designed for administrative listing and selection
     * scenarios rather than full-detail inspection.
     */
    data: IShoppingMallRegionSetting.ISummary[];
  };
}
