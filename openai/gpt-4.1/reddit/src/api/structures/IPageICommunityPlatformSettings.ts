import { IPage } from "./IPage";
import { ICommunityPlatformSettings } from "./ICommunityPlatformSettings";

export namespace IPageICommunityPlatformSettings {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformSettings.ISummary[];
  };
}
