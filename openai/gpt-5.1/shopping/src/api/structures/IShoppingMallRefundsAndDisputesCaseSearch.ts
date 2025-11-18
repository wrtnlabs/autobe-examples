import { tags } from "typia";

export namespace IShoppingMallRefundsAndDisputesCaseSearch {
  /**
   * Search criteria and pagination options for locating refund-,
   * cancellation-, and dispute-related cases in the shoppingMall platform.
   *
   * This DTO is used as the request body of the complex search operation
   * `PATCH /shoppingMall/admin/refundsAndDisputes/search/cases`. It allows
   * admin users to filter cases that originate from
   * `shopping_mall_cancellation_requests`, `shopping_mall_refund_requests`,
   * and `shopping_mall_disputes`, and to narrow down results based on status,
   * creation date, SLA compliance, and related order or actor information.
   *
   * The structure separates filter conditions from pagination and sorting
   * controls so that clients can construct rich queries while keeping the
   * request body predictable. All filter fields are optional, and combining
   * multiple filters results in intersection semantics (logical AND) unless
   * the service documentation specifies otherwise.
   */
  export type IRequest = {
    /**
     * One-based index of the result page to retrieve.
     *
     * If omitted, the service applies a default, typically page 1. This
     * value works together with `limit` to define which slice of the
     * matching case set is returned.
     */
    page?: (number & tags.Type<"int32">) | undefined;

    /**
     * Maximum number of case summaries to return in a single page.
     *
     * If omitted, the service applies a default page size and may enforce
     * an upper bound to protect performance. Typical values range from 20
     * to 100, depending on operational needs.
     */
    limit?: (number & tags.Type<"int32">) | undefined;

    /**
     * List of case types to include in the search results.
     *
     * If provided, only cases whose logical type is one of the listed
     * values are returned. Leaving this field empty or omitting it means no
     * filtering by case type and the query may return cancellations,
     * refunds, and disputes together.
     */
    caseTypes?: string[] | undefined;

    /**
     * List of case lifecycle statuses to filter by.
     *
     * Only cases whose current status is one of the listed values are
     * included in the results. Leaving this field empty or omitting it
     * means no status-based filtering, and all statuses are eligible.
     */
    statuses?: string[] | undefined;

    /**
     * List of actor types that initiated the cases to include in the
     * results.
     *
     * When provided, only cases whose requester type is in this list are
     * returned. This is commonly used to separate customer-initiated cases
     * from seller-initiated or admin-initiated ones.
     */
    requestedByActorTypes?: string[] | undefined;

    /**
     * External or business-visible identifier of the order associated with
     * the cases being searched.
     *
     * This field is used to restrict results to cases linked to a specific
     * order, typically via `shopping_mall_order_id` and the corresponding
     * external order code on `shopping_mall_orders`. When set, it is common
     * for this filter to dominate other filters and narrow results to a
     * single order-related cluster of cases.
     */
    orderCode?: string | undefined;

    /**
     * Business-visible identifier of the customer whose cases should be
     * returned.
     *
     * This is often a stable external code or login identifier that maps to
     * a record in `shopping_mall_customers`. It allows admins to review all
     * relevant cancellation, refund, and dispute cases for a particular
     * customer.
     */
    customerCode?: string | undefined;

    /**
     * Business-visible identifier of the seller whose cases should be
     * returned.
     *
     * This value maps to seller identities in `shopping_mall_sellers` and
     * is useful to review cases where a particular seller is involved, such
     * as refund cases, seller-initiated cancellations, or disputes tied to
     * that seller's orders.
     */
    sellerCode?: string | undefined;

    /**
     * If true, restricts the search results to cases that have at least one
     * recorded SLA violation.
     *
     * Internally, this filter uses `shopping_mall_case_sla_violations` to
     * determine which cases are considered breached. When false or omitted,
     * both compliant and non-compliant cases may be returned depending on
     * other filters.
     */
    includeOnlySlaBreached?: boolean | undefined;

    /**
     * Start of the creation timestamp range for cases to include.
     *
     * Cases whose creation timestamp is greater than or equal to this value
     * are eligible for inclusion. The value should be provided in ISO 8601
     * date-time format, typically in UTC.
     */
    createdFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of the creation timestamp range for cases to include.
     *
     * Cases whose creation timestamp is less than or equal to this value
     * are eligible for inclusion. The value should be provided in ISO 8601
     * date-time format, typically in UTC. When used together with
     * `createdFrom`, the pair defines a closed time interval.
     */
    createdTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Primary sort field to apply when ordering the search results.
     *
     * Common values include `created_at`, `updated_at`, `status`, and
     * `slaRisk`. The exact allowed values are defined by the search
     * implementation. If omitted, a sensible default such as `created_at`
     * descending is typically applied.
     */
    sortBy?: string | undefined;

    /**
     * Sort direction for the primary sort field.
     *
     * The value is usually `asc` for ascending or `desc` for descending,
     * matching common ordering semantics. If omitted, the service applies a
     * default direction, often `desc` for time-based fields.
     */
    sortDirection?: string | undefined;
  };
}
