import { IPage } from "./IPage";
import { ICommunityPlatformCommunityBan } from "./ICommunityPlatformCommunityBan";

export namespace IPageICommunityPlatformCommunityBan {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformCommunityBan.ISummary[];
  };
}
