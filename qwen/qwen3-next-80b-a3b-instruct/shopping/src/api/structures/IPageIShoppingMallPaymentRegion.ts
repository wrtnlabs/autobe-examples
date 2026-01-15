import { IPage } from "./IPage";
import { IShoppingMallPaymentRegion } from "./IShoppingMallPaymentRegion";

export namespace IPageIShoppingMallPaymentRegion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentRegion.ISummary[];
  };
}
