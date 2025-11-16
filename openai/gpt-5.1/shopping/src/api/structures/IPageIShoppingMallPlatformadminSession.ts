import { IPage } from "./IPage";
import { IShoppingMallPlatformadminSession } from "./IShoppingMallPlatformadminSession";

export namespace IPageIShoppingMallPlatformadminSession {
  /**
   * Paginated collection of platform administrator authentication session
   * summaries.
   *
   * This DTO represents one page of results produced when querying
   * `shopping_mall_platformadmin_sessions` for a specific
   * `shopping_mall_platformadmin` account. It combines generic pagination
   * metadata with an array of session summary records so that security and
   * operations teams can efficiently scan, sort, and navigate a large set of
   * admin login sessions for audit and monitoring purposes.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of platform
     * administrator sessions being returned.
     *
     * This structure follows the `IPage.IPagination` contract and includes
     * fields such as the current page index, the maximum number of records
     * per page, the total number of matching session records, and the total
     * number of pages. Clients use this information to drive paging
     * controls and to request previous or next pages when browsing
     * administrator sessions.
     */
    pagination: IPage.IPagination;

    /**
     * Array of platform administrator session summary records for the
     * requested page.
     *
     * Each element is an `IShoppingMallPlatformadminSession.ISummary` that
     * encapsulates high‑level information about one authentication session
     * originating from the `shopping_mall_platformadmin_sessions` Prisma
     * model, linked to a specific `shopping_mall_platformadmin` account.
     * These summaries expose identifiers, timestamps, IP address, user
     * agent, and active/expired indicators used by the
     * `/shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/sessions`
     * endpoint for security audits and troubleshooting.
     */
    data: IShoppingMallPlatformadminSession.ISummary[];
  };
}
