import { IPage } from "./IPage";
import { IShoppingMallSystemConfiguration } from "./IShoppingMallSystemConfiguration";

export namespace IPageIShoppingMallSystemConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSystemConfiguration.ISummary[];
  };
}
