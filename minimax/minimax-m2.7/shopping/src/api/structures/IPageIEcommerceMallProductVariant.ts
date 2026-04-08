import { IEcommerceMallProductVariant } from "./IEcommerceMallProductVariant";
import { IPageIEcommerceMall } from "./IPageIEcommerceMall";

export namespace IPageIEcommerceMallProductVariant {
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
     * @x-autobe-specification List of records of type IEcommerceMallProductVariant.ISummary.
     */
    data: IEcommerceMallProductVariant.ISummary[];
  };
}
