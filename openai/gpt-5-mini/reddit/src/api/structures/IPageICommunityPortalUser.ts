import { IPage } from "./IPage";
import { ICommunityPortalUser } from "./ICommunityPortalUser";

export namespace IPageICommunityPortalUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPortalUser.ISummary[];
  };
}
