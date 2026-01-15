import { IPage } from "./IPage";
import { IShoppingMallCarrier } from "./IShoppingMallCarrier";

export namespace IPageIShoppingMallCarrier {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCarrier.ISummary[];
  };
}
