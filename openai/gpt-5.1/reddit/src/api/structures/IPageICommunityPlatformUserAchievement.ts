import { IPage } from "./IPage";
import { ICommunityPlatformUserAchievement } from "./ICommunityPlatformUserAchievement";

export namespace IPageICommunityPlatformUserAchievement {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserAchievement.ISummary[];
  };
}
