import { IEcommerceMallAdminRequestOfCustomer } from "./IEcommerceMallAdminRequestOfCustomer";
import { IPageIEcommerceMall } from "./IPageIEcommerceMall";

export namespace IPageIEcommerceMallAdminRequestOfCustomer {
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
    pagination: IPageIEcommerceMall.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEcommerceMallAdminRequest.ISummary.
     */
    data: IEcommerceMallAdminRequestOfCustomer.ISummary[];
  };
}
