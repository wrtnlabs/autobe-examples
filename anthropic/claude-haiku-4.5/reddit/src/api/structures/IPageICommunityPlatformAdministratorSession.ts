import { IPage } from "./IPage";
import { ICommunityPlatformAdministratorSession } from "./ICommunityPlatformAdministratorSession";

export namespace IPageICommunityPlatformAdministratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdministratorSession.ISummary[];
  };
}
