import { IPage } from "./IPage";
import { ICommunityPlatformAdminuser } from "./ICommunityPlatformAdminuser";

export namespace IPageICommunityPlatformAdminuser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdminuser.ISummary[];
  };
}
