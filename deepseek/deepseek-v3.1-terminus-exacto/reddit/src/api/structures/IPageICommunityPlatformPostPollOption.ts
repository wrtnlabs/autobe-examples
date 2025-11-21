import { IPage } from "./IPage";
import { ICommunityPlatformPostPollOption } from "./ICommunityPlatformPostPollOption";

export namespace IPageICommunityPlatformPostPollOption {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformPostPollOption.ISummary[];
  };
}
