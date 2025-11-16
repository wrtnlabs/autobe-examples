import { IPage } from "./IPage";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IPageIShoppingMallSeller {
  /**
   * Paginated collection of seller summary records returned from the seller
   * search endpoint.
   *
   * This schema is used as the response body for operations such as `PATCH
   * /shoppingMall/sellers`, which query the `shopping_mall_seller` table
   * using filters, sorting, and pagination options specified in
   * `IShoppingMallSeller.IRequest`. The `pagination` property describes the
   * overall result set and current page window, while `data` contains the
   * list of `IShoppingMallSeller.ISummary` entries that belong to that page.
   *
   * API consumers typically render each summary in `data` as a row in an
   * internal dashboard or back-office management table where operators can
   * browse, search, and audit seller accounts. For detailed inspection or
   * modification of a specific seller, clients use the identifiers provided
   * in these summary records to call dedicated detail or update endpoints
   * that return the full seller DTO.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of seller search results.
     *
     * This object follows the `IPage.IPagination` structure and exposes
     * fields such as the current page index, the maximum number of records
     * per page, the total number of matching records in the database, and
     * the computed total number of pages.
     *
     * Client applications use this metadata to render paging controls (for
     * example, next/previous buttons and page indicators) and to build
     * follow-up search requests that retrieve subsequent or previous pages
     * of `IShoppingMallSeller.ISummary` records.
     */
    pagination: IPage.IPagination;

    /**
     * Array of seller summary records for the requested page of results.
     *
     * Each element is an `IShoppingMallSeller.ISummary` projection derived
     * from the `shopping_mall_seller` Prisma model. These summaries contain
     * the key identification and status fields required for list views
     * (such as the seller identifier, display or brand names, and
     * activation status) without exposing every column from the underlying
     * seller table.
     *
     * This array may be empty when no seller accounts match the applied
     * search and filter criteria, while the surrounding `pagination` object
     * still accurately describes the empty result set (for example,
     * `records` equal to 0 and a single page).
     */
    data: IShoppingMallSeller.ISummary[];
  };
}
