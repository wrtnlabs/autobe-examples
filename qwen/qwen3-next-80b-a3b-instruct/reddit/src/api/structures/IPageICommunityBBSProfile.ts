import { IPage } from "./IPage";
import { ICommunityBBSProfile } from "./ICommunityBBSProfile";

export namespace IPageICommunityBBSProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityBBSProfile.ISummary[];
  };
}
