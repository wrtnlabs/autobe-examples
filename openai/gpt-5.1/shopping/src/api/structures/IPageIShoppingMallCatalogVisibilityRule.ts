import { IPage } from "./IPage";
import { IShoppingMallCatalogVisibilityRule } from "./IShoppingMallCatalogVisibilityRule";

export namespace IPageIShoppingMallCatalogVisibilityRule {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCatalogVisibilityRule.ISummary[];
  };
}
