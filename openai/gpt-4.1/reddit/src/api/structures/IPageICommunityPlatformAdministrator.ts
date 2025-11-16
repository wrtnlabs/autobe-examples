import { IPage } from "./IPage";
import { ICommunityPlatformAdministrator } from "./ICommunityPlatformAdministrator";

export namespace IPageICommunityPlatformAdministrator {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdministrator.ISummary[];
  };
}
