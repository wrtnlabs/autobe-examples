import { IPage } from "./IPage";
import { ICommunityPlatformAdminVerificationToken } from "./ICommunityPlatformAdminVerificationToken";

export namespace IPageICommunityPlatformAdminVerificationToken {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformAdminVerificationToken.ISummary[];
  };
}
