import { IPage } from "./IPage";
import { IShoppingMallCatalogBlockReason } from "./IShoppingMallCatalogBlockReason";

export namespace IPageIShoppingMallCatalogBlockReason {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCatalogBlockReason.ISummary[];
  };
}
