import { IPage } from "./IPage";
import { IShoppingMallArticleTag } from "./IShoppingMallArticleTag";

export namespace IPageIShoppingMallArticleTag {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallArticleTag.ISummary[];
  };
}
