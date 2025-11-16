import { IPage } from "./IPage";
import { IShoppingMallCustomer } from "./IShoppingMallCustomer";

export namespace IPageIShoppingMallCustomer {
  /**
   * Paginated collection of customer account summary records.
   *
   * Wraps `IShoppingMallCustomer.ISummary` items together with pagination
   * metadata for administrative search over the `shopping_mall_customer`
   * table.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the customer search result.
     *
     * Represents the current page index, page size, total records, and
     * total pages returned when searching `shopping_mall_customer` accounts
     * for platform administrators.
     */
    pagination: IPage.IPagination;

    /**
     * List of customer summary records for the current page.
     *
     * Each element is an `IShoppingMallCustomer.ISummary` rather than a
     * full customer detail DTO, optimized for administrative list grids and
     * search views.
     */
    data: IShoppingMallCustomer.ISummary[];
  };
}
