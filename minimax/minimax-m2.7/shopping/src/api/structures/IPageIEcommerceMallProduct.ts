import { IEcommerceMallProduct } from "./IEcommerceMallProduct";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallProduct {
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
     * @x-autobe-specification List of records of type IEcommerceMallProduct.ISummary.
     */
    data: IEcommerceMallProduct.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IAnalytic = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IEcommerceMallProduct.IAnalytic.
     */
    data: IEcommerceMallProduct.IAnalytic[];
  };
}
