import { IPage } from "./IPage";
import { IEconDiscussPost } from "./IEconDiscussPost";

export namespace IPageIEconDiscussPost {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconDiscussPost.ISummary[];
  };
}
