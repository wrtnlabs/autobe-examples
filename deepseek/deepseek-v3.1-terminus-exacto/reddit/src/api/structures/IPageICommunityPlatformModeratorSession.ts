import { IPage } from "./IPage";
import { ICommunityPlatformModeratorSession } from "./ICommunityPlatformModeratorSession";

export namespace IPageICommunityPlatformModeratorSession {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformModeratorSession.ISummary[];
  };
}
