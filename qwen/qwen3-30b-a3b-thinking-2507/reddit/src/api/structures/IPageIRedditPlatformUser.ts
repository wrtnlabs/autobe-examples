import { IPage } from "./IPage";
import { IRedditPlatformUser } from "./IRedditPlatformUser";

export namespace IPageIRedditPlatformUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditPlatformUser.ISummary[];
  };
}
