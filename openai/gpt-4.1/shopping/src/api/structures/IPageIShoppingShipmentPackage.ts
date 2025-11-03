import { IPage } from "./IPage";
import { IShoppingShipmentPackage } from "./IShoppingShipmentPackage";

export namespace IPageIShoppingShipmentPackage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingShipmentPackage.ISummary[];
  };
}
