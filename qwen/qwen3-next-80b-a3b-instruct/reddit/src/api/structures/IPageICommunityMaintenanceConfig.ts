import { ICommunityMaintenanceConfig } from "./ICommunityMaintenanceConfig";
import { IPage } from "./IPage";

export namespace IPageICommunityMaintenanceConfig {
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
     * @x-autobe-specification List of records of type ICommunityMaintenanceConfig.ISummary.
     */
    data: ICommunityMaintenanceConfig.ISummary[];
  };
}
