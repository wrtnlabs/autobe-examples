import { IPage } from "./IPage";
import { ICommunityPlatformReport } from "./ICommunityPlatformReport";

export namespace IPageICommunityPlatformReport {
  /**
   * Paginated collection of content violation report summaries for moderation
   * queue management.
   *
   * Provides moderators and administrators with filtered, sorted report
   * listings for reviewing the moderation workflow. Supports searching and
   * filtering by violation category, report status, priority level, and date
   * ranges to help prioritize and organize review work.
   *
   * Each page contains an array of report summaries with essential
   * information needed to assess violations and route to appropriate
   * moderators. Pagination enables browsing through large volumes of reports
   * efficiently while maintaining performance. Results are sortable by
   * creation date, priority, status, or last update timestamp in ascending or
   * descending order.
   *
   * This paginated response directly corresponds to the
   * community_platform_reports table and integrates with the moderation queue
   * display, supporting administrators in managing platform content policy
   * enforcement.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /**
     * List of lightweight report summaries from the moderation queue.
     *
     * Each item contains essential report information optimized for
     * moderation workflows: violation category, current status, priority
     * level, reporter identity, and assigned moderator. This lightweight
     * representation enables efficient display in moderation queues without
     * loading complete report details.
     */
    data: ICommunityPlatformReport.ISummary[];
  };
}
