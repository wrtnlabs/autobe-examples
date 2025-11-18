import { IPage } from "./IPage";
import { IShoppingMallShipmentSearch } from "./IShoppingMallShipmentSearch";

export namespace IPageIShoppingMallShipmentSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallShipmentSearch.ISummary[];
  };
}
