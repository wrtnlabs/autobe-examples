import { IPage } from "./IPage";
import { ICommunityPlatformInventoryAlerts } from "./ICommunityPlatformInventoryAlerts";

export namespace IPageICommunityPlatformInventoryAlerts {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformInventoryAlerts.ISummary[];
  };
}
