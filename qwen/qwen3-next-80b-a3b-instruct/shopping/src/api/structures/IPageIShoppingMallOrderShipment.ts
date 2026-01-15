import { IPage } from "./IPage";
import { IShoppingMallOrderShipment } from "./IShoppingMallOrderShipment";

export namespace IPageIShoppingMallOrderShipment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallOrderShipment.ISummary[];
  };
}
