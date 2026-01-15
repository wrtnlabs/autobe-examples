import { IPage } from "./IPage";
import { IShoppingMallPaymentVaultEntry } from "./IShoppingMallPaymentVaultEntry";

export namespace IPageIShoppingMallPaymentVaultEntry {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentVaultEntry.ISummary[];
  };
}
