import { IPage } from "./IPage";
import { IShoppingMallSecurityEvent } from "./IShoppingMallSecurityEvent";

export namespace IPageIShoppingMallSecurityEvent {
  /**
   * Paginated list of security event summaries recorded in the shopping mall
   * platform.
   *
   * This wrapper schema represents one page of
   * `IShoppingMallSecurityEvent.ISummary` records read from the
   * `shopping_mall_security_events` Prisma model according to search criteria
   * such as event type, actor, and time window. It is used by platform
   * administrator tools and security dashboards to navigate through
   * historical security activity while keeping responses bounded and easy to
   * consume.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of security event
     * results.
     *
     * It indicates which page of security events is being returned from the
     * `shopping_mall_security_events` Prisma model, including the page
     * index, page size, total number of matching events, and total pages.
     * Admin consoles and monitoring dashboards use this information to
     * paginate through large volumes of security activity.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of security event summary records returned for the
     * requested page.
     *
     * Each element is an `IShoppingMallSecurityEvent.ISummary` object
     * representing a single row from the `shopping_mall_security_events`
     * table, exposing key attributes such as event type, timestamp, actor
     * information, and client metadata. This array forms the main content
     * of security monitoring views, incident investigation screens, and
     * audit exports.
     */
    data: IShoppingMallSecurityEvent.ISummary[];
  };
}
