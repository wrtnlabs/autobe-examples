import { IPage } from "./IPage";
import { IShoppingMallPaymentAuthorization } from "./IShoppingMallPaymentAuthorization";

export namespace IPageIShoppingMallPaymentAuthorization {
  /**
   * Paginated collection of payment authorization summary records for a
   * specific payment transaction in the shopping mall platform.
   *
   * This type represents a single page of
   * `IShoppingMallPaymentAuthorization.ISummary` items associated with a
   * parent payment transaction, together with pagination metadata from
   * `IPage.IPagination`. It is used as the standard response wrapper for
   * administrative search operations over the
   * `shopping_mall_payment_authorizations` Prisma model, for example the
   * endpoint that lists authorization attempts under
   * `/shoppingMall/platformAdmin/paymentTransactions/{paymentTransactionId}/authorizations`.
   *
   * The `pagination` object captures the current page index, page size, total
   * number of matching authorization attempts, and total page count, enabling
   * client applications to implement robust paging controls when
   * investigating long authorization histories. The `data` array contains the
   * individual authorization summaries for the requested page, each including
   * identifiers, requested amount, currency, status, timestamps, and a
   * reference to the parent payment transaction summary. This combination
   * allows platform administrators, finance teams, and support operators to
   * efficiently inspect authorization lifecycles, analyze retry patterns, and
   * troubleshoot payment issues while maintaining consistent pagination
   * behavior across related payment APIs.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentAuthorization.ISummary[];
  };
}
