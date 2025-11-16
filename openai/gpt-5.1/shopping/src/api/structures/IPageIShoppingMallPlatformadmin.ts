import { IPage } from "./IPage";
import { IShoppingMallPlatformAdmin } from "./IShoppingMallPlatformAdmin";

export namespace IPageIShoppingMallPlatformadmin {
  /**
   * Paginated collection of platform administrator summary records used in
   * oversight and administration consoles.
   *
   * This schema is typically used as the response body for endpoints such as
   * `PATCH /shoppingMall/platformAdmin/platformAdmins`, which query the
   * `shopping_mall_platformadmin` Prisma model using filters, time ranges,
   * and role-based criteria defined by `IShoppingMallPlatformAdmin.IRequest`.
   * The `pagination` object describes where the current page sits within the
   * overall result set, and `data` contains the corresponding
   * `IShoppingMallPlatformAdmin.ISummary` items for that page.
   *
   * Admin-facing UIs render each summary in `data` as a row in a management
   * or audit table, allowing privileged operators to quickly scan, sort, and
   * filter administrator accounts. When an operator needs full details or
   * must change roles or statuses, they use the identifiers supplied in these
   * summary entries to call more specialized endpoints that work with the
   * full `IShoppingMallPlatformAdmin` DTO and related role-assignment
   * entities.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of platform
     * administrator search results.
     *
     * The `IPage.IPagination` structure includes the current page index,
     * page size limit, total number of matching admin accounts, and total
     * page count. Together these values allow client applications to
     * implement paging controls and to navigate through the full set of
     * `IShoppingMallPlatformAdmin.ISummary` results returned by
     * administrative search operations.
     *
     * Back-office tools use this metadata to keep the list of
     * administrators in sync with server-side filtering, ensuring that
     * subsequent search requests request the correct page of data.
     */
    pagination: IPage.IPagination;

    /**
     * Array of platform administrator summary records for the requested
     * page.
     *
     * Each item in this list is an `IShoppingMallPlatformAdmin.ISummary`
     * DTO that captures high-level, non-sensitive information about a
     * platform administrator account, such as identifiers, display name,
     * email, and role key. Sensitive authentication details remain in
     * dedicated auth models and are never exposed here.
     *
     * The list may be empty when no administrator records satisfy the
     * applied filters or search keywords, while the `pagination` field
     * still correctly reports that zero records were found and that only a
     * single empty page exists.
     */
    data: IShoppingMallPlatformAdmin.ISummary[];
  };
}
