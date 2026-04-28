import { IPage } from "./IPage";
import { IRedditClonePostSnapshot } from "./IRedditClonePostSnapshot";

export namespace IPageIRedditClonePostSnapshot {
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
         *   IRedditClonePostSnapshot.ISummary.
     */
    data: IRedditClonePostSnapshot.ISummary[];
  };
}
