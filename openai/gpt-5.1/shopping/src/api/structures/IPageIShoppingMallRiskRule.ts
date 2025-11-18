import { IPage } from "./IPage";
import { IShoppingMallRiskRule } from "./IShoppingMallRiskRule";

export namespace IPageIShoppingMallRiskRule {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRiskRule.ISummary[];
  };
}
