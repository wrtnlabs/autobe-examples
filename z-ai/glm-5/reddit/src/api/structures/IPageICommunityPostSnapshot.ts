import { ICommunityPostSnapshot } from "./ICommunityPostSnapshot";
import { IPage } from "./IPage";

export namespace IPageICommunityPostSnapshot {
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
     * @x-autobe-specification List of records of type ICommunityPostSnapshot.ISummary.
     */
    data: ICommunityPostSnapshot.ISummary[];
  };
}
