import { IDiscussionBoardSectionAdministrator } from "./IDiscussionBoardSectionAdministrator";
import { IPage } from "./IPage";

export namespace IPageIDiscussionBoardSectionAdministrator {
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
     * @x-autobe-specification List of records of type IDiscussionBoardSectionAdministrator.ISummary.
     */
    data: IDiscussionBoardSectionAdministrator.ISummary[];
  };
}
