import { IPage } from "./IPage";
import { IShoppingMallEmailVerificationToken } from "./IShoppingMallEmailVerificationToken";

export namespace IPageIShoppingMallEmailVerificationToken {
  /**
   * Paginated collection of email verification token summaries tied to a
   * specific authentication credentials record.
   *
   * This wrapper DTO is returned by the PATCH
   * `/shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/emailVerificationTokens`
   * operation and represents a page of results over the
   * `shopping_mall_email_verification_tokens` table. The `pagination` section
   * communicates how the result set is segmented for navigation, and the
   * `data` array provides `IShoppingMallEmailVerificationToken.ISummary`
   * projections that are safe to display in administrative UIs and logs for
   * compliance, troubleshooting, and historical analysis of email
   * verification activity.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of email
     * verification token history.
     *
     * This field uses the `IPage.IPagination` schema to indicate which page
     * of results is being returned, how many records are included per page,
     * and how many total token records exist in
     * `shopping_mall_email_verification_tokens` for the scoped
     * authentication credentials. Administrative tools and support consoles
     * use this metadata to drive paging controls and to understand the
     * scale of verification token activity for a given account.
     */
    pagination: IPage.IPagination;

    /**
     * Array of email verification token summaries for the requested page.
     *
     * Each entry is an `IShoppingMallEmailVerificationToken.ISummary` DTO
     * derived from the `shopping_mall_email_verification_tokens` Prisma
     * model. These summaries expose non-sensitive metadata such as
     * identifiers and timestamps so that platform administrators and
     * support agents can audit verification flows, investigate abuse, and
     * debug login or email change issues without exposing raw token
     * secrets.
     */
    data: IShoppingMallEmailVerificationToken.ISummary[];
  };
}
