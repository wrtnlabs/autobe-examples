import { IPage } from "./IPage";
import { IShoppingSystemConfiguration } from "./IShoppingSystemConfiguration";

export namespace IPageIShoppingSystemConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingSystemConfiguration.ISummary[];
  };
}
