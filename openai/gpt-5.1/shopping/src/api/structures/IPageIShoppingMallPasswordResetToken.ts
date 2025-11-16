import { IPage } from "./IPage";
import { IShoppingMallPasswordResetToken } from "./IShoppingMallPasswordResetToken";

export namespace IPageIShoppingMallPasswordResetToken {
  /**
   * Paginated collection of password reset token summaries associated with a
   * single authentication credential.
   *
   * This wrapper is used as the response body for the PATCH search endpoint
   * at
   * `/shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/passwordResetTokens`.
   * It combines generic paging metadata from `IPage.IPagination` with a page
   * of `IShoppingMallPasswordResetToken.ISummary` rows so that platform
   * administrators and security operators can review password reset token
   * history in a structured, incremental way.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of password reset
     * token history.
     *
     * This object contains generic paging information such as the current
     * page index, page size limit, total record count, and total page
     * count. It is shared across all paginated responses in the
     * shoppingMall API so that client applications can implement consistent
     * paging controls in admin and security consoles.
     */
    pagination: IPage.IPagination;

    /**
     * List of password reset token summary records for the current page.
     *
     * Each entry is an `IShoppingMallPasswordResetToken.ISummary` object
     * representing a single row from the
     * `shopping_mall_password_reset_tokens` Prisma model, already scoped to
     * the authentication credential specified in the request path. The list
     * reflects the filters, sort order, and paging parameters supplied
     * through `IShoppingMallPasswordResetToken.IRequest`.
     */
    data: IShoppingMallPasswordResetToken.ISummary[];
  };
}
