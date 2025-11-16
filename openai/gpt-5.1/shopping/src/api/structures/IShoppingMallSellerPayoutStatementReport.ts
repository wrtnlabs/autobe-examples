import { tags } from "typia";

import { IShoppingMallReportDateRange } from "./IShoppingMallReportDateRange";
import { IEShoppingMallSellerPayoutStatus } from "./IEShoppingMallSellerPayoutStatus";
import { IShoppingMallPayoutStatementSort } from "./IShoppingMallPayoutStatementSort";

export namespace IShoppingMallSellerPayoutStatementReport {
  /**
   * Filter and configuration parameters for generating seller payout
   * statement reports in the shopping mall platform.
   *
   * This request DTO is used to retrieve payout-oriented analytical views
   * that explain how seller payout batches were computed from orders, payment
   * transactions, refunds, chargebacks, and other adjustments. It does not
   * map directly to a single Prisma model; instead, it controls the query
   * window and scoping across payout and order-related tables.
   *
   * The API uses a PATCH method with a request body because the filter
   * structure can be moderately complex and is better expressed as JSON than
   * as flat query parameters.
   */
  export type IRequest = {
    /**
     * Primary date/time window for selecting payout batches or associated
     * orders that should be included in the statement.
     *
     * Implementations may apply this range to payout creation time, payout
     * completion time, or order completion time depending on configured
     * business rules and the report mode. When omitted, the backend may
     * fall back to a sensible default window such as the most recent
     * settlement period configured for the tenant.
     */
    dateRange?: IShoppingMallReportDateRange | undefined;

    /**
     * IANA time zone identifier used to interpret the date range and
     * normalize timestamps within the payout statement, such as
     * "Asia/Seoul" or "UTC".
     *
     * Providing a consistent time zone ensures that daily and monthly
     * payout periods align with both platform and seller expectations. When
     * this field is omitted, the backend typically uses the platform’s
     * default reporting time zone.
     */
    timeZone?: string | undefined;

    /**
     * Optional list of seller identifiers to include in the payout
     * statement.
     *
     * Platform administrators may specify one or more sellers to inspect,
     * whereas individual sellers typically see only their own data and may
     * omit this field. When provided, only payout batches and items
     * belonging to the listed sellers are included; duplicates and unknown
     * IDs are silently ignored by the backend implementation.
     */
    sellerIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Optional list of payout status values to filter the statement, such
     * as scheduled, processing, or completed.
     *
     * This allows callers to focus on payouts that have been fully
     * processed, those that are upcoming, or a mixture of both depending on
     * reconciliation needs. When omitted, the report includes all payout
     * statuses that are relevant for the selected time window.
     */
    payoutStatusFilters?: IEShoppingMallSellerPayoutStatus[] | undefined;

    /**
     * Optional list of ISO 4217 currency codes for which payout information
     * should be returned.
     *
     * If omitted, the backend typically includes payouts in all supported
     * settlement currencies or defaults to the tenant’s primary currency,
     * depending on configuration. Duplicate currency codes are ignored, and
     * any unknown or unsupported codes are safely discarded without causing
     * the request to fail.
     */
    currencies?: string[] | undefined;

    /**
     * Flag indicating whether the statement should include per-order or
     * per-order-line level breakdown inside each payout row.
     *
     * When `true`, the underlying implementation may join additional order
     * and order line data so that each payout row exposes detailed
     * composition suitable for deep reconciliation. When `false`, a more
     * compact batch-level summary is returned for efficiency and faster
     * response times.
     */
    includeOrderBreakdown?: boolean | undefined;

    /**
     * Flag indicating whether refund and chargeback effects should be
     * explicitly broken out in the payout statement rows.
     *
     * When `true`, rows may contain or be backed by separate fields for
     * refunded amounts, chargeback amounts, and adjustments that reduced
     * the final payout amount, enabling fine-grained financial analysis.
     * When `false`, those effects may only be visible through the net
     * payout amount without exposing intermediate components in the report
     * payload.
     */
    includeRefundAndChargebackImpact?: boolean | undefined;

    /**
     * Page index for the paginated payout statement results, starting from
     * 1.
     *
     * Used together with `limit` to navigate through the full result set.
     * If this field is omitted, the backend typically defaults to the first
     * page (value `1`), ensuring a deterministic starting point for callers
     * that do not explicitly manage pagination state.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of payout statement rows to return in a single page.
     *
     * This value controls page size and therefore the number of rows in the
     * `data` array of the paginated response. The backend may impose an
     * upper bound to protect system resources and, when this field is
     * omitted, may apply a sensible default page size such as 20 or 50 rows
     * per page depending on platform configuration.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sorting configuration that defines the ordering of payout statement
     * rows.
     *
     * Callers can choose to sort by payout creation time, completion time,
     * seller identifier, gross amount, or other supported attributes, and
     * can specify ascending or descending order. When omitted, the backend
     * uses a stable default ordering, typically by payout creation or
     * completion time in descending order so that the most recent payouts
     * appear first.
     */
    sort?: IShoppingMallPayoutStatementSort | undefined;
  };
}
