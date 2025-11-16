import { IPage } from "./IPage";
import { IShoppingMallCustomer } from "./IShoppingMallCustomer";

export namespace IPageIShoppingMallCustomer {
  /**
   * A paginated page of customer summary records as returned by the admin
   * customer list/search API endpoints in the shopping mall platform.
   *
   * Provides a collection of IShoppingMallCustomer.ISummary objects for
   * administrative overviews, filtering, and user management dashboards.
   * Enables batch, filtered, and sorted navigation or review of registered
   * buyer accounts.
   */
  export type ISummary = {
    /**
     * Pagination metadata including current page, result limit, total
     * records, and page count for navigating through customer summaries in
     * admin dashboards.
     */
    pagination: IPage.IPagination;

    /**
     * A list of shopping mall customer summary objects for each account
     * matching current admin search/filters. Each entry encapsulates the
     * essential identity and reference data for buyer or account actor.
     */
    data: IShoppingMallCustomer.ISummary[];
  };
}
