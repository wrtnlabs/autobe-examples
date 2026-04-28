import { IHrmPlatformTimelog } from "./IHrmPlatformTimelog";
import { IPage } from "./IPage";

export namespace IPageIHrmPlatformTimelog {
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
         *   IHrmPlatformTimelog.ISummary.
     */
    data: IHrmPlatformTimelog.ISummary[];
  };
}
