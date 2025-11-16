import { IPage } from "./IPage";
import { IShoppingMallCustomerSession } from "./IShoppingMallCustomerSession";

export namespace IPageIShoppingMallCustomerSession {
  /**
   * Paginated list of customer authentication sessions for a specific
   * customer account.
   *
   * This DTO wraps a page of `IShoppingMallCustomerSession.ISummary` records
   * together with pagination metadata, allowing platform administrators to
   * browse, filter, and page through session history stored in the
   * `shopping_mall_customer_sessions` table. It is used as the response body
   * of the PATCH
   * `/shoppingMall/platformAdmin/customers/{customerId}/sessions` operation,
   * where the `customerId` path parameter identifies the owning
   * `shopping_mall_customer` and the request body provides search criteria.
   *
   * The `pagination` field describes how the full result set is sliced into
   * pages (current page, page size, total records, total pages), while the
   * `data` array contains the summary-level session rows for the current
   * page. Each summary exposes only safe connection and timing metadata
   * needed for security analysis and support, without including any
   * credential or token material.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the customer session list.
     *
     * This object exposes the current page index, page size, total record
     * count, and total page count for the
     * `IShoppingMallCustomerSession.ISummary` collection. It follows the
     * shared `IPage.IPagination` contract used across the shopping mall
     * backend so that admin tools can render consistent paginated lists.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of customer authentication session summaries for the
     * requested page.
     *
     * Each element is an `IShoppingMallCustomerSession.ISummary` DTO, which
     * is a projection of a single row from the
     * `shopping_mall_customer_sessions` Prisma model associated with the
     * target `shopping_mall_customer`. Typical fields include the session
     * `id`, originating `ip`, initial `href`, `referrer`, and the
     * `created_at` / `expired_at` timestamps that describe the lifecycle of
     * the session.
     *
     * In the context of the PATCH
     * `/shoppingMall/platformAdmin/customers/{customerId}/sessions`
     * endpoint, this array contains only the sessions that match the
     * supplied search and filter criteria (time ranges, status filters, IP
     * patterns, and so on) for the specific customer identified by the
     * `customerId` path parameter.
     */
    data: IShoppingMallCustomerSession.ISummary[];
  };
}
