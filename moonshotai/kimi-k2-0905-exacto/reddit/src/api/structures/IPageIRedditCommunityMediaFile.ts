import { IPage } from "./IPage";
import { IRedditCommunityMediaFile } from "./IRedditCommunityMediaFile";

export namespace IPageIRedditCommunityMediaFile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityMediaFile.ISummary[];
  };
}
