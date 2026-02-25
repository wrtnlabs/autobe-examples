import { IDiscussionBoardSecurityEvent } from "./IDiscussionBoardSecurityEvent";
import { IPageIDiscussionBoardSection } from "./IPageIDiscussionBoardSection";

export namespace IPageIDiscussionBoardSecurityEvent {
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
    pagination: IPageIDiscussionBoardSection.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IDiscussionBoardSecurityEvent.ISummary.
     */
    data: IDiscussionBoardSecurityEvent.ISummary[];
  };
}
