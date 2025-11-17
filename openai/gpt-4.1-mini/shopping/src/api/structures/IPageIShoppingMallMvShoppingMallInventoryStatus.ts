import { IPage } from "./IPage";
import { IShoppingMallMvShoppingMallInventoryStatus } from "./IShoppingMallMvShoppingMallInventoryStatus";

export namespace IPageIShoppingMallMvShoppingMallInventoryStatus {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallMvShoppingMallInventoryStatus.ISummary[];
  };
}
