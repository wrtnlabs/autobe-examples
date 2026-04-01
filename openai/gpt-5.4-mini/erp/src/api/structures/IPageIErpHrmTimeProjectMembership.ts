import { IErpHrmTimeProjectMembership } from "./IErpHrmTimeProjectMembership";
import { IPage } from "./IPage";

export namespace IPageIErpHrmTimeProjectMembership {
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
     * @x-autobe-specification List of records of type IErpHrmTimeProjectMembership.ISummary.
     */
    data: IErpHrmTimeProjectMembership.ISummary[];
  };
}
