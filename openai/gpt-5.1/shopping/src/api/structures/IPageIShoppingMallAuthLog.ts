import { IPage } from "./IPage";
import { IShoppingMallAuthLog } from "./IShoppingMallAuthLog";

export namespace IPageIShoppingMallAuthLog {
  /**
   * Paginated result set of authentication history summaries for the shopping
   * mall platform.
   *
   * This schema wraps a page of `IShoppingMallAuthLog.ISummary` objects
   * together with pagination metadata from `IPage.IPagination`, and is
   * returned by administrative auth-history search endpoints such as
   * `/shoppingMall/platformAdmin/authLogs` and user-specific history
   * endpoints for customers, sellers, and platform administrators. It is
   * optimized for audit, security monitoring, and support workflows where
   * operators need to browse, filter, and paginate over large volumes of
   * authentication events.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of authentication history
     * results.
     *
     * This object mirrors the `IPage.IPagination` contract and conveys the
     * current page index, page size, total record count, and total page
     * count for the underlying query against `shopping_mall_auth_logs`.
     * Administrative consoles and security tools use this information to
     * drive paging controls and to understand the overall volume of
     * authentication events that matched the search criteria.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of authentication log summary records for the requested
     * page.
     *
     * Each element is an `IShoppingMallAuthLog.ISummary` DTO that
     * represents a single authentication-related event (such as login,
     * logout, token refresh, or password reset) sourced from the
     * `shopping_mall_auth_logs` table. Together, these records provide a
     * timeline-style view of authentication activity that matches the
     * filters supplied in the corresponding `IShoppingMallAuthLog.IRequest`
     * search payload.
     */
    data: IShoppingMallAuthLog.ISummary[];
  };
}
