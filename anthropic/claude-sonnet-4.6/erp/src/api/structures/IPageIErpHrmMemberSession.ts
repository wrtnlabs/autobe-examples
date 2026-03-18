import { IErpHrmMemberSession } from "./IErpHrmMemberSession";
import { IPage } from "./IPage";

export namespace IPageIErpHrmMemberSession {
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
     * @x-autobe-specification List of records of type IErpHrmMemberSession.ISummary.
     */
    data: IErpHrmMemberSession.ISummary[];
  };
}
