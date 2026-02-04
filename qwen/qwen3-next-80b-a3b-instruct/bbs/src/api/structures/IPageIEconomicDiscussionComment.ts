import { IEconomicDiscussionComment } from "./IEconomicDiscussionComment";
import { IPage } from "./IPage";

export namespace IPageIEconomicDiscussionComment {
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
     * @x-autobe-specification List of records of type IEconomicDiscussionComment.ISummary.
     */
    data: IEconomicDiscussionComment.ISummary[];
  };
}
