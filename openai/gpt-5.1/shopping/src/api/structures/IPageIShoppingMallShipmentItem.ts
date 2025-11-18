import { IPage } from "./IPage";
import { IShoppingMallShipmentItem } from "./IShoppingMallShipmentItem";

export namespace IPageIShoppingMallShipmentItem {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipmentItem.ISummary[];
  };
}
