import { IPage } from "./IPage";
import { IShoppingMallAddress } from "./IShoppingMallAddress";

export namespace IPageIShoppingMallAddress {
  /**
   * Paginated API response containing a set of Shopping Mall Address summary
   * records, used for returning address books and list-style address
   * resources with pagination.
   *
   * Follows NestJS/REST API conventions for paginated collection endpoints,
   * including navigation metadata and result record arrays for UI display and
   * management.
   */
  export type ISummary = {
    /**
     * Paging metadata for this result set.
     *
     * Specifies the current page, limit, total records, and total pages for
     * the records returned as part of the paginated list. Required for user
     * interfaces to drive navigation and for backend to support client
     * paging requests.
     */
    pagination: IPage.IPagination;

    /**
     * Array of address summary records returned in the current page.
     *
     * Each entry represents an address book summary entry for
     * shopping_mall_addresses, used in address list, search, and filter
     * UIs. May be empty if no address records are present for the
     * actor/criteria.
     */
    data: IShoppingMallAddress.ISummary[];
  };
}
