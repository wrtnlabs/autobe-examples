import { IPage } from "./IPage";
import { IShoppingMallShipmentEvent } from "./IShoppingMallShipmentEvent";

export namespace IPageIShoppingMallShipmentEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipmentEvent.ISummary[];
  };
}
