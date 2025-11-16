import { IPage } from "./IPage";
import { IShoppingMallMileageTransaction } from "./IShoppingMallMileageTransaction";

export namespace IPageIShoppingMallMileageTransaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallMileageTransaction.ISummary[];
  };
}
