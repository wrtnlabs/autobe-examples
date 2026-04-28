import { IEcommercePlatformCustomer } from "./IEcommercePlatformCustomer";
import { IPage } from "./IPage";

export namespace IPageIEcommercePlatformCustomer {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
         * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
         * @x-autobe-specification List of records of type
         *   IEcommercePlatformCustomer.ISummary.
     */
    data: IEcommercePlatformCustomer.ISummary[];
  };
}
