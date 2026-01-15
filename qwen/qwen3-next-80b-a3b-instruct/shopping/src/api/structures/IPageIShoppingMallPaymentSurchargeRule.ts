import { IPage } from "./IPage";
import { IShoppingMallPaymentSurchargeRule } from "./IShoppingMallPaymentSurchargeRule";

export namespace IPageIShoppingMallPaymentSurchargeRule {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPaymentSurchargeRule.ISummary[];
  };
}
