import { IPage } from "./IPage";
import { IShoppingMallPromotionalCampaign } from "./IShoppingMallPromotionalCampaign";

export namespace IPageIShoppingMallPromotionalCampaign {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPromotionalCampaign.ISummary[];
  };
}
