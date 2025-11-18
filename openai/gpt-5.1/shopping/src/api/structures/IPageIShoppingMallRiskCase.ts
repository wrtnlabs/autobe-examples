import { IPage } from "./IPage";
import { IShoppingMallRiskCase } from "./IShoppingMallRiskCase";

export namespace IPageIShoppingMallRiskCase {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRiskCase.ISummary[];
  };
}
