import { IPage } from "./IPage";
import { IShoppingMallPoints } from "./IShoppingMallPoints";

export namespace IPageIShoppingMallPoints {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallPoints.ISummary[];
  };
}
