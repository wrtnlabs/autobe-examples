import { IPage } from "./IPage";
import { IRedditPlatformCommunityRule } from "./IRedditPlatformCommunityRule";

export namespace IPageIRedditPlatformCommunityRule {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformCommunityRule.ISummary[];
  };
}
