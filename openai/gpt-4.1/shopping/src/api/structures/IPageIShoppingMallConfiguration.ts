import { IPage } from "./IPage";
import { IShoppingMallConfiguration } from "./IShoppingMallConfiguration";

export namespace IPageIShoppingMallConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallConfiguration.ISummary[];
  };
}
