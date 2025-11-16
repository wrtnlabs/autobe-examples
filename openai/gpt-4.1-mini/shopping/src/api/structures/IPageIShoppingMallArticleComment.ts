import { IPage } from "./IPage";
import { IShoppingMallArticleComment } from "./IShoppingMallArticleComment";

export namespace IPageIShoppingMallArticleComment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallArticleComment.ISummary[];
  };
}
