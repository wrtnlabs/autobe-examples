import { IEcommerceMallShippingAddress } from "./IEcommerceMallShippingAddress";
import { IPageIEcommerceMall } from "./IPageIEcommerceMall";

export namespace IPageIEcommerceMallShippingAddress {
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
     * @x-autobe-specification List of records of type IEcommerceMallShippingAddress.ISummary.
     */
    data: IEcommerceMallShippingAddress.ISummary[];
  };
}
