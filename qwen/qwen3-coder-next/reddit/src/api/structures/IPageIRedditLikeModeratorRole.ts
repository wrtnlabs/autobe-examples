import { IPage } from "./IPage";
import { IRedditLikeModeratorRole } from "./IRedditLikeModeratorRole";

export namespace IPageIRedditLikeModeratorRole {
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
     * @x-autobe-specification List of records of type IRedditLikeModeratorRole.ISummary.
     */
    data: IRedditLikeModeratorRole.ISummary[];
  };

  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type IConduct = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IRedditLikeModeratorRole.IConduct.
     */
    data: IRedditLikeModeratorRole.IConduct[];
  };
}
