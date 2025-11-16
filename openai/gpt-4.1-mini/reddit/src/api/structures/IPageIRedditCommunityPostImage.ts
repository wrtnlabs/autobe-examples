import { IPage } from "./IPage";
import { IRedditCommunityPostImage } from "./IRedditCommunityPostImage";

export namespace IPageIRedditCommunityPostImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityPostImage.ISummary[];
  };
}
