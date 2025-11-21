import { IPage } from "./IPage";
import { IShoppingMallProductImage } from "./IShoppingMallProductImage";

export namespace IPageIShoppingMallProductImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallProductImage.ISummary[];
  };
}
