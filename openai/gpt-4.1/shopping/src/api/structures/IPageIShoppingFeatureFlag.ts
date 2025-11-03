import { IPage } from "./IPage";
import { IShoppingFeatureFlag } from "./IShoppingFeatureFlag";

export namespace IPageIShoppingFeatureFlag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingFeatureFlag.ISummary[];
  };
}
