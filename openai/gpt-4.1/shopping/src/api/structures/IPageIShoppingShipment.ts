import { IPage } from "./IPage";
import { IShoppingShipment } from "./IShoppingShipment";

export namespace IPageIShoppingShipment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingShipment.ISummary[];
  };
}
