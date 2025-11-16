import { IPage } from "./IPage";
import { IShoppingMallGuestUser } from "./IShoppingMallGuestUser";

export namespace IPageIShoppingMallGuestuser {
  /**
   * Paginated collection of guest user summary records.
   *
   * Wraps `IShoppingMallGuestUser.ISummary` items together with pagination
   * metadata for administrative search over the `shopping_mall_guestuser`
   * table.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the guest user search result.
     *
     * Represents the current page index, page size, total records, and
     * total pages returned when searching `shopping_mall_guestuser` records
     * for administrative analysis.
     */
    pagination: IPage.IPagination;

    /**
     * List of guest user summary records for the current page.
     *
     * Each element is an `IShoppingMallGuestUser.ISummary` rather than a
     * full guest user detail object, optimized for administrative list
     * views and search results.
     */
    data: IShoppingMallGuestUser.ISummary[];
  };
}
