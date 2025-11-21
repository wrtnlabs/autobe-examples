import { IPage } from "./IPage";
import { ICommunityPlatformMediaThumbnail } from "./ICommunityPlatformMediaThumbnail";

export namespace IPageICommunityPlatformMediaThumbnail {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMediaThumbnail.ISummary[];
  };
}
