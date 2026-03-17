import { ICommunityPlatformSubscriptionPreference } from "./ICommunityPlatformSubscriptionPreference";
import { IPage } from "./IPage";

export namespace IPageICommunityPlatformSubscriptionPreference {
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
     * @x-autobe-specification List of records of type ICommunityPlatformSubscriptionPreference.ISummary.
     */
    data: ICommunityPlatformSubscriptionPreference.ISummary[];
  };
}
