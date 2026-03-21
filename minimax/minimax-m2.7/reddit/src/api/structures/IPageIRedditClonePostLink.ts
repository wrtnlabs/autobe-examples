import { IPage } from "./IPage";
import { IRedditClonePostLink } from "./IRedditClonePostLink";

export namespace IPageIRedditClonePostLink {
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
     * @x-autobe-specification List of records of type IRedditClonePostLink.ISummary.
     */
    data: IRedditClonePostLink.ISummary[];
  };
}
