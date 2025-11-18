import { IPage } from "./IPage";
import { IShoppingMallCampaignMetric } from "./IShoppingMallCampaignMetric";

export namespace IPageIShoppingMallCampaignMetric {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCampaignMetric.ISummary[];
  };
}
