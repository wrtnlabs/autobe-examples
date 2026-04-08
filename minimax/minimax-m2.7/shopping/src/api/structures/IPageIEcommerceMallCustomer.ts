import { IEcommerceMallCustomer } from "./IEcommerceMallCustomer";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallCustomer {
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
     * @x-autobe-specification List of records of type IEcommerceMallCustomer.ISummary.
     */
    data: IEcommerceMallCustomer.ISummary[];
  };
}
