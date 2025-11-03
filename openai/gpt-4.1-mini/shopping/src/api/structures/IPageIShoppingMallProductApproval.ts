import { IPage } from "./IPage";
import { IShoppingMallProductApproval } from "./IShoppingMallProductApproval";

export namespace IPageIShoppingMallProductApproval {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductApproval.ISummary[];
  };
}
