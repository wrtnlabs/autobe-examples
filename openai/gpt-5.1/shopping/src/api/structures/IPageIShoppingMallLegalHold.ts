import { IPage } from "./IPage";
import { IShoppingMallLegalHold } from "./IShoppingMallLegalHold";

export namespace IPageIShoppingMallLegalHold {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallLegalHold.ISummary[];
  };
}
