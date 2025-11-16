import { IPage } from "./IPage";
import { ICommunityPlatformAdministratorProfile } from "./ICommunityPlatformAdministratorProfile";

export namespace IPageICommunityPlatformAdministratorProfile {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdministratorProfile.ISummary[];
  };
}
