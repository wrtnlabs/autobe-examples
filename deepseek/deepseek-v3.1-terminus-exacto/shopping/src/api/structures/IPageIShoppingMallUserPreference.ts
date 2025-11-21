import { IPage } from "./IPage";
import { IShoppingMallUserPreference } from "./IShoppingMallUserPreference";

export namespace IPageIShoppingMallUserPreference {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallUserPreference.ISummary[];
  };
}
