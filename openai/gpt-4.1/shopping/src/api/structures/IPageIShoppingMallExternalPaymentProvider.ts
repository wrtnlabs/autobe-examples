import { IPage } from "./IPage";
import { IShoppingMallExternalPaymentProvider } from "./IShoppingMallExternalPaymentProvider";

export namespace IPageIShoppingMallExternalPaymentProvider {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallExternalPaymentProvider.ISummary[];
  };
}
