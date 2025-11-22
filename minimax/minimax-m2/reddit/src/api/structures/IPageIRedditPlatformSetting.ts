import { IPage } from "./IPage";
import { IRedditPlatformSetting } from "./IRedditPlatformSetting";

export namespace IPageIRedditPlatformSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformSetting.ISummary[];
  };
}
