import { IPage } from "./IPage";
import { IShoppingMallArticleCategory } from "./IShoppingMallArticleCategory";

export namespace IPageIShoppingMallArticleCategory {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallArticleCategory.ISummary[];
  };
}
