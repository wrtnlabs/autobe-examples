import { IPage } from "./IPage";
import { IRedditCommunitySystemSetting } from "./IRedditCommunitySystemSetting";

export namespace IPageIRedditCommunitySystemSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunitySystemSetting.ISummary[];
  };
}
