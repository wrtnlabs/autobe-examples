import { IPage } from "./IPage";
import { ICommunityPlatformPostMedia } from "./ICommunityPlatformPostMedia";

export namespace IPageICommunityPlatformPostMedia {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostMedia.ISummary[];
  };
}
