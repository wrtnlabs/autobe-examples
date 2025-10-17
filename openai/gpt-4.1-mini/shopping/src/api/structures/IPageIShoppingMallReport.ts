import { IPage } from "./IPage";
import { IShoppingMallReport } from "./IShoppingMallReport";

export namespace IPageIShoppingMallReport {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReport.ISummary[];
  };
}
