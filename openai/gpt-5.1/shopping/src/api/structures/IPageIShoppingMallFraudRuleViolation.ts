import { IPage } from "./IPage";
import { IShoppingMallFraudRuleViolation } from "./IShoppingMallFraudRuleViolation";

export namespace IPageIShoppingMallFraudRuleViolation {
  /**
   * Paginated result set of fraud rule violation summaries recorded in the
   * shopping mall risk and fraud subsystem.
   *
   * This wrapper schema combines a collection of
   * `IShoppingMallFraudRuleViolation.ISummary` records—each aligned with a
   * row in the `shopping_mall_fraud_rule_violations` Prisma model and its
   * related fraud rule definition—with pagination metadata from
   * `IPage.IPagination`. It serves as the response body for administrative
   * and analytical search endpoints like `PATCH
   * /shoppingMall/platformAdmin/fraudRuleViolations` and
   * `/shoppingMall/platformAdmin/analytics/fraudViolations`.
   *
   * By standardizing on a `pagination` object and a `data` array, this type
   * allows risk analysts, operations staff, and admin UIs to navigate large
   * sets of fraud rule violations efficiently. The `pagination` section
   * communicates how the current slice of violation data relates to the
   * overall result set, while the `data` array focuses on the violation
   * summaries that are most relevant for list views, dashboards, and
   * drill‑down workflows.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window over fraud rule
     * violation search results.
     *
     * This object conforms to `IPage.IPagination` and captures the current
     * page index, page size (limit), total count of violation records that
     * matched the search criteria in `shopping_mall_fraud_rule_violations`,
     * and the computed number of pages. It allows risk operations consoles
     * and analytics dashboards to render pagination controls and to request
     * additional pages of violation data in a consistent way.
     */
    pagination: IPage.IPagination;

    /**
     * List of fraud rule violation summaries returned for the current page
     * of the search.
     *
     * Each element is an `IShoppingMallFraudRuleViolation.ISummary` object
     * representing a single violation event recorded in the
     * `shopping_mall_fraud_rule_violations` Prisma model. These summaries
     * typically expose identifiers, associated rule metadata, actor
     * information, severity, status, and key timestamps, providing enough
     * information for triage queues, dashboards, and high‑level analytics
     * without loading the full violation detail.
     *
     * The content and ordering of this collection are controlled by the
     * analytical filters and sorting options provided via
     * `IShoppingMallFraudRuleViolation.IRequest` to endpoints such as
     * `PATCH /shoppingMall/platformAdmin/fraudRuleViolations` and `PATCH
     * /shoppingMall/platformAdmin/analytics/fraudViolations`. Clients
     * consume this array to render lists of violations and combine it with
     * the `pagination` object to support efficient, incremental exploration
     * of large violation datasets.
     */
    data: IShoppingMallFraudRuleViolation.ISummary[];
  };
}
