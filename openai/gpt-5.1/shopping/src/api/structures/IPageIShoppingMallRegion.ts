import { IPage } from "./IPage";
import { IShoppingMallRegion } from "./IShoppingMallRegion";

export namespace IPageIShoppingMallRegion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRegion.ISummary[];
  };
}
