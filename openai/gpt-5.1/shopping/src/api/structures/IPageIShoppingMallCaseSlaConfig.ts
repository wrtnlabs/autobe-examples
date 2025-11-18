import { IPage } from "./IPage";
import { IShoppingMallCaseSlaConfig } from "./IShoppingMallCaseSlaConfig";

export namespace IPageIShoppingMallCaseSlaConfig {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCaseSlaConfig.ISummary[];
  };
}
