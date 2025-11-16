import { IPage } from "./IPage";
import { ICommunityPlatformUserSettings } from "./ICommunityPlatformUserSettings";

export namespace IPageICommunityPlatformUserSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserSettings.ISummary[];
  };
}
