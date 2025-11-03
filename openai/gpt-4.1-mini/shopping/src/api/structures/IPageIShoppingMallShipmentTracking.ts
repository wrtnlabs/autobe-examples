import { IPage } from "./IPage";
import { IShoppingMallShipmentTracking } from "./IShoppingMallShipmentTracking";

export namespace IPageIShoppingMallShipmentTracking {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipmentTracking.ISummary[];
  };
}
