import { IPage } from "./IPage";
import { IShoppingMallVariant } from "./IShoppingMallVariant";

export namespace IPageIShoppingMallVariant {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallVariant.ISummary[];
  };
}
