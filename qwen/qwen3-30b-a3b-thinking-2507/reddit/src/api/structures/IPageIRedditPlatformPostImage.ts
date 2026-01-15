import { IPage } from "./IPage";
import { IRedditPlatformPostImage } from "./IRedditPlatformPostImage";

export namespace IPageIRedditPlatformPostImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformPostImage.ISummary[];
  };
}
