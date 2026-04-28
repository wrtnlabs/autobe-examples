import { IEcommerceAnalytic } from "./IEcommerceAnalytic";
import { IPage } from "./IPage";

export namespace IPageIEcommerceAnalytic {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IResult = {
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
         *   IEcommerceAnalytic.IResult.
     */
    data: IEcommerceAnalytic.IResult[];
  };
}
