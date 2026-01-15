import { IPage } from "./IPage";
import { ICommunityPlatformSystemAlerts } from "./ICommunityPlatformSystemAlerts";

export namespace IPageICommunityPlatformSystemAlerts {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSystemAlerts.ISummary[];
  };
}
