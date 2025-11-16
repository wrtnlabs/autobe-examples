import { IPage } from "./IPage";
import { IShoppingMallAdminActionAudit } from "./IShoppingMallAdminActionAudit";

export namespace IPageIShoppingMallAdminActionAudit {
  /**
   * Paginated collection of administrator action audit summary records for
   * the shopping mall platform.
   *
   * This wrapper is returned by search and analytics endpoints such as `PATCH
   * /shoppingMall/platformAdmin/adminActionAudits` and `PATCH
   * /shoppingMall/platformAdmin/analytics/adminActionAudits`, which query the
   * `shopping_mall_admin_action_audits` Prisma model using an
   * `IShoppingMallAdminActionAudit.IRequest` filter payload.
   *
   * The `pagination` property describes the current page, page size, and
   * total number of matching audit records, while the `data` array contains
   * the corresponding `IShoppingMallAdminActionAudit.ISummary` entries for
   * that page. Together they allow admin UIs and reporting tools to
   * efficiently navigate large audit trails without loading all records at
   * once.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current window of administrator action
     * audit records.
     *
     * This property exposes the standard `IPage.IPagination` structure,
     * which includes the 1‑based current page index, the configured page
     * size limit, the total number of matching audit records in the data
     * set, and the total number of pages derived from those values.
     *
     * Admin dashboards and tools use this information to render paging
     * controls, compute whether there are previous or next pages, and
     * understand how the current slice of data fits within the complete
     * `shopping_mall_admin_action_audits` result set.
     */
    pagination: IPage.IPagination;

    /**
     * List of administrator action audit summary records for the requested
     * page.
     *
     * Each element in this array is an
     * `IShoppingMallAdminActionAudit.ISummary` DTO, representing a single
     * row from the `shopping_mall_admin_action_audits` Prisma table in a
     * lightweight form suitable for list and table views. The sequence of
     * items respects the sorting and filtering rules applied by the
     * corresponding search request.
     *
     * When no audit records match the applied filters, this array will be
     * empty while `pagination` still reflects the overall result window and
     * total count.
     */
    data: IShoppingMallAdminActionAudit.ISummary[];
  };
}
