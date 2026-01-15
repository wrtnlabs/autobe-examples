import { IPage } from "./IPage";
import { IRedditPlatformSearch } from "./IRedditPlatformSearch";

export namespace IPageIRedditPlatformSearch {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformSearch.ISummary[];
  };
}
