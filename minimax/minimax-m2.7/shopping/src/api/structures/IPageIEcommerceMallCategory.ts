import { IEcommerceMallCategory } from "./IEcommerceMallCategory";
import { IPageIEcommerceMall } from "./IPageIEcommerceMall";

export namespace IPageIEcommerceMallCategory {
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
     * @x-autobe-specification List of records of type IEcommerceMallCategory.ISummary.
     */
    data: IEcommerceMallCategory.ISummary[];
  };
}
