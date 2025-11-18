import { IPage } from "./IPage";
import { IShoppingMallCaseSlaViolation } from "./IShoppingMallCaseSlaViolation";

export namespace IPageIShoppingMallCaseSlaViolation {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCaseSlaViolation.ISummary[];
  };
}
