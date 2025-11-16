import { IPage } from "./IPage";
import { IRedditCommunityPlatformSetting } from "./IRedditCommunityPlatformSetting";

export namespace IPageIRedditCommunityPlatformSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityPlatformSetting.ISummary[];
  };
}
