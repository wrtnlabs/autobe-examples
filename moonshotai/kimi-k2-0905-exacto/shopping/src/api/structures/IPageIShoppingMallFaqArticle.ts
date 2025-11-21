import { IPage } from "./IPage";
import { IShoppingMallFaqArticle } from "./IShoppingMallFaqArticle";

export namespace IPageIShoppingMallFaqArticle {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallFaqArticle.ISummary[];
  };
}
