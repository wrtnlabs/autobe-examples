import { IPage } from "./IPage";
import { IShoppingMallPaymentMethodSurcharge } from "./IShoppingMallPaymentMethodSurcharge";

export namespace IPageIShoppingMallPaymentMethodSurcharge {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentMethodSurcharge.ISummary[];
  };
}
