import { IPage } from "./IPage";
import { IShoppingMallBusinessPolicy } from "./IShoppingMallBusinessPolicy";

export namespace IPageIShoppingMallBusinessPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallBusinessPolicy.ISummary[];
  };
}
