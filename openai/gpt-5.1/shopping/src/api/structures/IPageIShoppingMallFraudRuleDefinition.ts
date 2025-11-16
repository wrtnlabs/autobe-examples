import { IPage } from "./IPage";
import { IShoppingMallFraudRuleDefinition } from "./IShoppingMallFraudRuleDefinition";

export namespace IPageIShoppingMallFraudRuleDefinition {
  /**
   * Paginated result set of fraud rule definition summaries for the shopping
   * mall risk engine.
   *
   * This schema wraps a collection of
   * `IShoppingMallFraudRuleDefinition.ISummary` records, each derived from a
   * row in the `shopping_mall_fraud_rule_definitions` Prisma model, together
   * with pagination metadata supplied by `IPage.IPagination`. It is used as
   * the response body type for search operations such as `PATCH
   * /shoppingMall/platformAdmin/fraudRuleDefinitions`, where platform
   * administrators browse, filter, and sort fraud and risk rule definitions.
   *
   * The wrapper ensures that every response carries a consistent structure:
   * the `pagination` object describes how the current slice of data relates
   * to the full result set, and the `data` array contains only the summaries
   * for the requested page. This design enables admin tools and risk
   * dashboards to implement efficient, server‑driven pagination while keeping
   * payloads compact and tailored to list and overview screens.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window over fraud rule
     * definition search results.
     *
     * This object follows the `IPage.IPagination` schema and exposes fields
     * such as the current page index, page size (limit), total number of
     * records that matched the filter in
     * `shopping_mall_fraud_rule_definitions`, and the total number of
     * pages. It allows admin UIs and risk tools to render pagination
     * controls and to request the next or previous page of rule definitions
     * in a predictable way.
     */
    pagination: IPage.IPagination;

    /**
     * List of fraud rule definition summaries returned for the current page
     * of the search.
     *
     * Each entry in this array is an
     * `IShoppingMallFraudRuleDefinition.ISummary` object that corresponds
     * logically to a single row in the
     * `shopping_mall_fraud_rule_definitions` Prisma model. The summary
     * contains key business attributes such as the rule’s business code,
     * human‑readable name, severity, activation status, and timestamps,
     * which are sufficient for list views and table‑based admin screens.
     *
     * The concrete content of this collection is determined by the filters,
     * sorting, and pagination parameters supplied via
     * `IShoppingMallFraudRuleDefinition.IRequest` to endpoints like `PATCH
     * /shoppingMall/platformAdmin/fraudRuleDefinitions`. Clients typically
     * iterate over this array to render rule definition lists and use the
     * associated pagination metadata to navigate large rule catalogs.
     */
    data: IShoppingMallFraudRuleDefinition.ISummary[];
  };
}
