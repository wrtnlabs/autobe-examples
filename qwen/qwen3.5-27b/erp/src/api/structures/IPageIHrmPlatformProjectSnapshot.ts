import { IHrmPlatformProjectSnapshot } from "./IHrmPlatformProjectSnapshot";
import { IPage } from "./IPage";

export namespace IPageIHrmPlatformProjectSnapshot {
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
     * @x-autobe-specification List of records of type IHrmPlatformProjectSnapshot.ISummary.
     */
    data: IHrmPlatformProjectSnapshot.ISummary[];
  };
}
