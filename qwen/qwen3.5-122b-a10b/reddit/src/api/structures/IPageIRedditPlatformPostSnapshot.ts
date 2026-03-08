import { IPage } from "./IPage";
import { IRedditPlatformPostSnapshot } from "./IRedditPlatformPostSnapshot";

export namespace IPageIRedditPlatformPostSnapshot {
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
     * @x-autobe-specification List of records of type IRedditPlatformPostSnapshot.ISummary.
     */
    data: IRedditPlatformPostSnapshot.ISummary[];
  };
}
