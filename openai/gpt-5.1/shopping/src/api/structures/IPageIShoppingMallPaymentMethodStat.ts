import { IPage } from "./IPage";
import { IShoppingMallPaymentMethodStat } from "./IShoppingMallPaymentMethodStat";

export namespace IPageIShoppingMallPaymentMethodStat {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentMethodStat.ISummary[];
  };
}
