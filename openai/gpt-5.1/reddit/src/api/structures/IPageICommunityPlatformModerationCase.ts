import { IPage } from "./IPage";
import { ICommunityPlatformModerationCase } from "./ICommunityPlatformModerationCase";

export namespace IPageICommunityPlatformModerationCase {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModerationCase.ISummary[];
  };
}
