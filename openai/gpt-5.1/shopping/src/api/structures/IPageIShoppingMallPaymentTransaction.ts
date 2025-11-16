import { IPage } from "./IPage";
import { IShoppingMallPaymentTransaction } from "./IShoppingMallPaymentTransaction";

export namespace IPageIShoppingMallPaymentTransaction {
  /**
   * Paginated collection of payment transaction summary records for the
   * shopping mall platform.
   *
   * This type represents a single page of
   * `IShoppingMallPaymentTransaction.ISummary` items together with pagination
   * metadata described by `IPage.IPagination`. It is the canonical response
   * wrapper for search and list operations that query the
   * `shopping_mall_payment_transactions` Prisma model, such as the platform
   * administrator endpoint that retrieves filtered and sorted payment
   * transactions for finance, risk, or support dashboards.
   *
   * The `pagination` property describes the current page index, page size,
   * total record count, and total page count so that clients can build paging
   * controls and navigate large payment datasets efficiently. The `data`
   * array contains the actual transaction summaries for the current page,
   * each exposing key identifiers, monetary amounts, status, currency, and
   * timestamps, without loading full transaction details or related entities.
   * Together, these fields allow administrative UIs to render list views,
   * implement infinite scrolling, and drive drill-down flows into individual
   * payment transactions while preserving clear, consistent paging semantics
   * across the API.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentTransaction.ISummary[];
  };
}
