import { IPage } from "./IPage";
import { IRedditCommunityMember } from "./IRedditCommunityMember";

export namespace IPageIRedditCommunityMember {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityMember.ISummary[];
  };
}
