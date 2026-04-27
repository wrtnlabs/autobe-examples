import { IHrmTimeTrackingOrganizationFile } from "./IHrmTimeTrackingOrganizationFile";
import { IPage } from "./IPage";

export namespace IPageIHrmTimeTrackingOrganizationFile {
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
     * @x-autobe-specification List of records of type IHrmTimeTrackingOrganizationFile.ISummary.
     */
    data: IHrmTimeTrackingOrganizationFile.ISummary[];
  };
}
