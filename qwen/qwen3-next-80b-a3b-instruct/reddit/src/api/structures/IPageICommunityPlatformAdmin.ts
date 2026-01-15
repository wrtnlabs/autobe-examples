import { IPage } from "./IPage";
import { ICommunityPlatformAdmin } from "./ICommunityPlatformAdmin";

export namespace IPageICommunityPlatformAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdmin.ISummary[];
  };
}
