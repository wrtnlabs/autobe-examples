import { IPage } from "./IPage";
import { IShoppingMallArticle } from "./IShoppingMallArticle";

export namespace IPageIShoppingMallArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallArticle.ISummary[];
  };
}
