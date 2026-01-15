import { IPage } from "./IPage";
import { IDiscussionBoardArticleFile } from "./IDiscussionBoardArticleFile";

export namespace IPageIDiscussionBoardArticleFile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IDiscussionBoardArticleFile.ISummary[];
  };
}
