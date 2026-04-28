import { IEcommercePlatformOrder } from "./IEcommercePlatformOrder";
import { IPage } from "./IPage";

export namespace IPageIEcommercePlatformOrder {
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
         *   IEcommercePlatformOrder.ISummary.
     */
    data: IEcommercePlatformOrder.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IFulfillmentSummary = {
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
         *   IEcommercePlatformOrder.IFulfillmentSummary.
     */
    data: IEcommercePlatformOrder.IFulfillmentSummary[];
  };
}
