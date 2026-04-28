import { IErpHrmContract } from "./IErpHrmContract";
import { IPage } from "./IPage";

export namespace IPageIErpHrmContract {
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
         *   IErpHrmContract.ISummary.
     */
    data: IErpHrmContract.ISummary[];
  };
}
