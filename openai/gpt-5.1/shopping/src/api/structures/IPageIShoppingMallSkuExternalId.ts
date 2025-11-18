import { IPage } from "./IPage";
import { IShoppingMallSkuExternalId } from "./IShoppingMallSkuExternalId";

export namespace IPageIShoppingMallSkuExternalId {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallSkuExternalId.ISummary[];
  };
}
