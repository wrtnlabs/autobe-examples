import { IPage } from "./IPage";
import { IShoppingMallDeliveryEvent } from "./IShoppingMallDeliveryEvent";

export namespace IPageIShoppingMallDeliveryEvent {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallDeliveryEvent.ISummary[];
  };
}
