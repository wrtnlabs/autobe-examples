import { IPage } from "./IPage";
import { IRedditLikeGuestSession } from "./IRedditLikeGuestSession";

export namespace IPageIRedditLikeGuestSession {
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
         *   IRedditLikeGuestSession.ISummary.
     */
    data: IRedditLikeGuestSession.ISummary[];
  };
}
