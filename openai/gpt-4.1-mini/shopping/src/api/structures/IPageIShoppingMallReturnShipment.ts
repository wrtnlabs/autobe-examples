import { IPage } from "./IPage";
import { IShoppingMallReturnShipment } from "./IShoppingMallReturnShipment";

export namespace IPageIShoppingMallReturnShipment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReturnShipment.ISummary[];
  };
}
