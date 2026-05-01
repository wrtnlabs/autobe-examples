import { ICommunityHubMemberEmailVerification } from "./ICommunityHubMemberEmailVerification";
import { IPage } from "./IPage";

export namespace IPageICommunityHubMemberEmailVerification {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
         * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
         * @x-autobe-specification List of records of type
         *   ICommunityHubMemberEmailVerification.ISummary.
     */
    data: ICommunityHubMemberEmailVerification.ISummary[];
  };
}
