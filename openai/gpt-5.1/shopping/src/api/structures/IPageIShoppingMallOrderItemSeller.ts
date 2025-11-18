import { IPage } from "./IPage";
import { IShoppingMallOrderItemSeller } from "./IShoppingMallOrderItemSeller";

export namespace IPageIShoppingMallOrderItemSeller {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderItemSeller.ISummary[];
  };
}
