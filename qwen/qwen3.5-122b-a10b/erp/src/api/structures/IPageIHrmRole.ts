import { IHrmRole } from "./IHrmRole";
import { IPage } from "./IPage";

export namespace IPageIHrmRole {
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
         * @x-autobe-specification List of records of type IHrmRole.ISummary.
     */
    data: IHrmRole.ISummary[];
  };
}
