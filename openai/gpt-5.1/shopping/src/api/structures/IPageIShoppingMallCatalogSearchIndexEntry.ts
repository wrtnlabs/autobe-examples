import { IPage } from "./IPage";
import { IShoppingMallCatalogSearchIndexEntry } from "./IShoppingMallCatalogSearchIndexEntry";

export namespace IPageIShoppingMallCatalogSearchIndexEntry {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallCatalogSearchIndexEntry.ISummary[];
  };
}
