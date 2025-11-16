import { IPage } from "./IPage";
import { ICommunityPlatformSearchIndex } from "./ICommunityPlatformSearchIndex";

export namespace IPageICommunityPlatformSearchIndex {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSearchIndex.ISummary[];
  };
}
