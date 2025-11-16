import { IPage } from "./IPage";
import { IShoppingMallAuthCredentials } from "./IShoppingMallAuthCredentials";

export namespace IPageIShoppingMallAuthCredentials {
  /**
   * Paginated collection of authentication credential summaries for the
   * shoppingMall platform.
   *
   * This DTO is the standard response envelope for search operations over the
   * `shopping_mall_auth_credentials` table, such as the
   * `/shoppingMall/authCredentials` endpoint. It combines paging information
   * with a list of credential summary objects so that administrative UIs and
   * security consoles can browse, filter, and analyze credential state and
   * associated risk signals across customers, sellers, and platform
   * administrators.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current window of authentication
     * credential records returned by the search.
     *
     * This structure follows the `IPage.IPagination` contract and includes
     * details such as current page index, page size, total number of
     * matching credential records, and total number of pages. It allows
     * admin tools to render paging controls and to iterate through large
     * result sets from the `shopping_mall_auth_credentials` table.
     */
    pagination: IPage.IPagination;

    /**
     * Array of authentication credential summary records for the requested
     * page.
     *
     * Each element is an `IShoppingMallAuthCredentials.ISummary`
     * representing a single row from the `shopping_mall_auth_credentials`
     * Prisma model, potentially enriched with polymorphic actor context and
     * derived risk indicators. These summaries are used by the
     * `/shoppingMall/authCredentials` search endpoint to let administrators
     * inspect login identifiers, actor ownership, status flags, and
     * high‑level risk state without exposing sensitive password hashes or
     * internal secrets.
     */
    data: IShoppingMallAuthCredentials.ISummary[];
  };
}
