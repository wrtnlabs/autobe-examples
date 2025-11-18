import { IPage } from "./IPage";
import { IShoppingMallConfig } from "./IShoppingMallConfig";

export namespace IPageIShoppingMallConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallConfig.ISummary[];
  };
}
