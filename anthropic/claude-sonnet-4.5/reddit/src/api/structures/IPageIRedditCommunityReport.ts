import { IPage } from "./IPage";
import { IRedditCommunityReport } from "./IRedditCommunityReport";

export namespace IPageIRedditCommunityReport {
  /**
   * Paginated response containing content violation report summaries with
   * navigation metadata.
   *
   * This schema represents a single page of report records returned by
   * moderator report search and filtering operations. It combines the actual
   * report data array with pagination information to enable efficient
   * browsing of potentially large report queues.
   *
   * Used by operations that retrieve filtered lists of content violation
   * reports, including global report searches and community-specific report
   * queues. The pagination wrapper allows clients to navigate through report
   * results without loading the entire dataset, improving performance and
   * user experience.
   *
   * The data array contains IRedditCommunityReport.ISummary records providing
   * lightweight report information optimized for list displays. The
   * pagination object provides the metadata needed for constructing page
   * navigation controls and calculating result offsets.
   *
   * This response type integrates with the reddit_community_reports table
   * from the Prisma schema, presenting search results in a standardized
   * paginated format used consistently across the platform.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the report result set.
     *
     * Provides essential information including current page number, items
     * per page limit, total record count, and total pages available. Used
     * by clients to construct pagination controls and navigate between
     * pages of report data.
     *
     * Enables efficient browsing of large report queues without loading all
     * reports at once.
     */
    pagination: IPage.IPagination;

    /**
     * Array of content violation report summary records for the current
     * page.
     *
     * Contains the actual report data matching the search criteria and
     * pagination parameters. Each element provides essential report
     * information including violation category, status, reporter identity,
     * and community context.
     *
     * Array size is controlled by the pagination limit parameter and may be
     * smaller on the last page.
     */
    data: IRedditCommunityReport.ISummary[];
  };
}
