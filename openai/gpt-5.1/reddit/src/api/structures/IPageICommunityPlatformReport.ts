import { IPage } from "./IPage";
import { ICommunityPlatformReport } from "./ICommunityPlatformReport";

export namespace IPageICommunityPlatformReport {
  /**
   * Paginated collection of report summaries derived from
   * community_platform_reports and its related subtype tables.
   *
   * This wrapper type is used by search endpoints such as PATCH
   * /communityPlatform/platformAdmin/reports and PATCH
   * /communityPlatform/communityModerator/search/reports. It bundles standard
   * pagination information with an array of ICommunityPlatformReport.ISummary
   * records so that moderation and safety dashboards can efficiently browse,
   * filter, and navigate large sets of reports while maintaining accurate
   * counts and page navigation state.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current slice of report search
     * results.
     *
     * This object follows the shared IPage.IPagination contract and
     * includes values such as the current page index, page size, total
     * number of matching reports, and total page count. Moderation
     * dashboards use this information to implement paged navigation through
     * large report queues.
     */
    pagination: IPage.IPagination;

    /**
     * List of report summary DTOs for the current page of a moderation or
     * safety search.
     *
     * Each element is an ICommunityPlatformReport.ISummary object
     * representing a single top-level report row from
     * community_platform_reports, enriched with key reporter, target,
     * reason category, status, and timestamp information. The array is
     * optimized for list and queue views in moderation tools and
     * intentionally omits heavier detail fields that are retrieved via
     * dedicated detail endpoints when moderators drill into a specific
     * report.
     */
    data: ICommunityPlatformReport.ISummary[];
  };
}
