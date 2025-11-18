import { IPage } from "./IPage";
import { IShoppingMallAccountRiskFlag } from "./IShoppingMallAccountRiskFlag";

export namespace IPageIShoppingMallAccountRiskFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAccountRiskFlag.ISummary[];
  };
}
