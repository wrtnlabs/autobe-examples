import { IEcommerceMallSeller } from "./IEcommerceMallSeller";
import { IPage } from "./IPage";

export namespace IPageIEcommerceMallSeller {
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
     * @x-autobe-specification List of records of type IEcommerceMallSeller.ISummary.
     */
    data: IEcommerceMallSeller.ISummary[];
  };

  export namespace IAnalytic {
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
       * @x-autobe-specification List of records of type IEcommerceMallSeller.IAnalytic.ISummary.
       */
      data: IEcommerceMallSeller.IAnalytic.ISummary[];
    };
  }
}
