import { IPage } from "./IPage";
import { ICommunityPlatformMemberSuspension } from "./ICommunityPlatformMemberSuspension";

export namespace IPageICommunityPlatformMemberSuspension {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberSuspension.ISummary[];
  };
}
