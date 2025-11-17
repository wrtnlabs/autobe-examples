import { IPage } from "./IPage";
import { ICommunityPlatformUser } from "./ICommunityPlatformUser";

export namespace IPageICommunityPlatformUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUser.ISummary[];
  };
}
