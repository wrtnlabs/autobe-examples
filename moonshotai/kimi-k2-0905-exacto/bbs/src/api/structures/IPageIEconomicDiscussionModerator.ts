import { IEconomicDiscussionModerator } from "./IEconomicDiscussionModerator";
import { IPage } from "./IPage";

export namespace IPageIEconomicDiscussionModerator {
  /**
   * A page of economic discussion moderator summary information for
   * administrative oversight and moderation team management.
   *
   * This pagination wrapper provides essential moderator data for
   * administrative displays, enabling efficient oversight of the moderation
   * team. The schema supports security monitoring by providing moderator
   * identification and authorization level information without exposing
   * sensitive personal details.
   *
   * Business usage includes moderator directory browsing, authorization
   * audits, team coordination displays, and administrative oversight
   * functions. The summary data enables quick identification of moderator
   * roles and permissions while maintaining privacy protection for sensitive
   * moderator information.
   *
   * The pagination structure supports large moderation teams by providing
   * efficient navigation through moderator listings with configurable page
   * sizes and sorting options. This enables scalable administration as the
   * discussion platform grows and requires more sophisticated moderation
   * oversight capabilities.
   */
  export type ISummary = {
    /**
     * List of moderator summary records matching search criteria with
     * essential identification and authorization information for
     * administrative review.
     */
    data: IEconomicDiscussionModerator.ISummary[];

    /**
     * Page navigation and total record count information enabling efficient
     * browsing through large moderation teams while supporting
     * administrative oversight workflows.
     */
    pagination: IPage.IPagination;
  };
}
