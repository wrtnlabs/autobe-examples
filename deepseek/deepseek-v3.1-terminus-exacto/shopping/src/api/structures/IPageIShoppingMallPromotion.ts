import { IPage } from "./IPage";
import { IShoppingMallPromotion } from "./IShoppingMallPromotion";

export namespace IPageIShoppingMallPromotion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPromotion.ISummary[];
  };
}
