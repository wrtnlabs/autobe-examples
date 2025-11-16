import { tags } from "typia";

import { IShoppingMallReportDateRange } from "./IShoppingMallReportDateRange";
import { IEShoppingMallPaymentSettlementStatus } from "./IEShoppingMallPaymentSettlementStatus";
import { IShoppingMallSettlementReportSort } from "./IShoppingMallSettlementReportSort";

export namespace IShoppingMallPaymentSettlementReport {
  /**
   * Filter and configuration parameters for generating the shopping mall
   * payment settlement report.
   *
   * This request DTO encapsulates the reporting window, scoping, and
   * aggregation options for building a settlement-oriented view across
   * payment transactions, refunds, chargebacks, and seller payouts. It is
   * read-only and does not correspond to a single Prisma table; instead, it
   * is used to parameterize analytical queries over multiple payment and
   * settlement models.
   *
   * The API uses this type in a PATCH operation because the filter structure
   * can be complex and nested, and is therefore supplied in the request body
   * rather than as simple query parameters.
   */
  export type IRequest = {
    /**
     * Inclusive date/time range that defines which payment-side events are
     * considered in the settlement report.
     *
     * Typical implementations use either the payment transaction creation
     * timestamp, capture timestamp, or payout settlement timestamp as the
     * primary axis, depending on business rules. If omitted, the backend
     * may apply a sensible default window such as the last 7 days.
     */
    dateRange?: IShoppingMallReportDateRange | undefined;

    /**
     * IANA time zone identifier used to interpret the provided date range
     * and to normalize timestamps in the report, for example "Asia/Seoul"
     * or "UTC".
     *
     * Providing an explicit time zone ensures that financial periods such
     * as days or months align with business expectations. If omitted, the
     * backend may fall back to a platform default time zone.
     */
    timeZone?: string | undefined;

    /**
     * Optional list of payment method codes to include in the settlement
     * report.
     *
     * Each entry typically corresponds to a configured payment method
     * record (for example, `card_visa`, `card_master`, `bank_transfer`,
     * `virtual_account`). When provided, only settlement data originating
     * from the specified methods will be included.
     */
    paymentMethodCodes?: string[] | undefined;

    /**
     * Optional list of ISO 4217 currency codes (such as "KRW", "USD",
     * "EUR") to include in the report.
     *
     * If omitted, the report may include all currencies or apply a platform
     * default. When multiple currencies are requested, the report usually
     * does not attempt currency conversion; values are reported in their
     * native currency.
     */
    currencies?: string[] | undefined;

    /**
     * Optional list of seller identifiers to scope the settlement report to
     * specific merchants.
     *
     * When provided, only transactions, refunds, chargebacks, and payouts
     * that involve one of the listed sellers are considered. This is
     * primarily used by platform administrators to focus on particular
     * sellers; sellers themselves typically receive scoping via
     * authentication context and may leave this unset.
     */
    sellerIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Flag indicating whether pending or in-progress refund transactions
     * should be included in the report.
     *
     * When `true`, rows may include amounts related to refunds that have
     * been requested but not yet fully settled by the payment processor.
     * When `false`, only fully completed refunds are incorporated into the
     * aggregated amounts.
     */
    includePendingRefunds?: boolean | undefined;

    /**
     * Flag indicating whether payout batches that are scheduled or
     * processing, but not yet fully completed, should be included.
     *
     * This allows finance users to examine future or in-flight settlements
     * in addition to already completed payouts. When omitted, the backend
     * may default to completed-only payouts for conservative
     * reconciliation.
     */
    includePendingPayouts?: boolean | undefined;

    /**
     * Optional list of high-level settlement status values to include in
     * the report.
     *
     * These statuses represent normalized states computed from underlying
     * payment, refund, chargeback, and payout data, such as whether a
     * settlement unit is fully settled, partially refunded, in dispute, or
     * chargebacked.
     */
    statusFilters?: IEShoppingMallPaymentSettlementStatus[] | undefined;

    /**
     * Optional lower bound filter on gross payment amount for included
     * settlement rows.
     *
     * When provided, only rows whose gross amount is greater than or equal
     * to this value are returned. This is often used to focus on
     * higher-value transactions during reconciliation or investigation.
     */
    minGrossAmount?: number | undefined;

    /**
     * Optional upper bound filter on gross payment amount for included
     * settlement rows.
     *
     * When provided together with `minGrossAmount`, this defines a
     * gross-amount range for the report. If omitted, no upper bound is
     * applied.
     */
    maxGrossAmount?: number | undefined;

    /**
     * Page index for paginated settlement results, starting from 1.
     *
     * Used together with `limit` to control which slice of the report is
     * returned. If omitted, the backend may default to the first page.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of settlement rows to return in a single page.
     *
     * The backend may enforce an upper bound for performance reasons.
     * Typical defaults range from 20 to 100 items per page.
     */
    limit?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Sorting configuration that controls the ordering of settlement rows
     * in the response.
     *
     * Callers can choose to sort by transaction time, settlement time,
     * gross amount, net amount, or other supported fields and specify
     * ascending or descending order.
     */
    sort?: IShoppingMallSettlementReportSort | undefined;
  };
}
