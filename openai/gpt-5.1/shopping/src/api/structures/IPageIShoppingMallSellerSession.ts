import { IPage } from "./IPage";
import { IShoppingMallSellerSession } from "./IShoppingMallSellerSession";

export namespace IPageIShoppingMallSellerSession {
  /**
   * Paginated list of seller authentication sessions for a specific seller
   * account.
   *
   * This DTO wraps a page of `IShoppingMallSellerSession.ISummary` records
   * together with pagination metadata so that platform administrators can
   * systematically review the login and session activity of a given seller.
   * It is used as the response body of the PATCH
   * `/shoppingMall/platformAdmin/sellers/{sellerId}/sessions` operation,
   * where the `sellerId` path parameter identifies the owning
   * `shopping_mall_seller` and the request body provides search, filtering,
   * and sorting options.
   *
   * The `pagination` field communicates how the full set of matching
   * `shopping_mall_seller_sessions` rows has been partitioned into pages,
   * while the `data` array contains the session summaries for the current
   * page. This structure supports security investigations, fraud analysis,
   * and operational diagnostics without exposing low-level credential data or
   * token material in the page wrapper itself.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the seller session list.
     *
     * This object follows the shared `IPage.IPagination` structure used
     * throughout the shopping mall APIs and indicates which slice of the
     * seller session result set is being returned (current page, page size,
     * total records, and total pages). It enables admin UIs to render
     * consistent paging controls when inspecting seller activity.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of seller authentication session summaries for the
     * requested page.
     *
     * Each element is an `IShoppingMallSellerSession.ISummary` DTO derived
     * from a row in the `shopping_mall_seller_sessions` Prisma model and
     * includes key identification and lifecycle timestamps, along with a
     * lightweight `IShoppingMallSeller.ISummary` association identifying
     * the owning seller account. Sensitive connection details remain
     * encapsulated by the inner summary DTO and are limited to what is
     * needed for investigative and operational review.
     *
     * Within the PATCH
     * `/shoppingMall/platformAdmin/sellers/{sellerId}/sessions` endpoint,
     * this array contains only sessions that belong to the seller
     * identified by the `sellerId` path parameter and that match the
     * supplied search filters (time range, optional status filters, IP
     * patterns, and similar criteria).
     */
    data: IShoppingMallSellerSession.ISummary[];
  };
}
