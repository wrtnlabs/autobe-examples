import { IPage } from "./IPage";
import { IShoppingMallLegalHoldTarget } from "./IShoppingMallLegalHoldTarget";

export namespace IPageIShoppingMallLegalHoldTarget {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallLegalHoldTarget.ISummary[];
  };
}
