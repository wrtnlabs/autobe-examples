import { IPage } from "./IPage";
import { ICommunityPlatformReportReasonCategory } from "./ICommunityPlatformReportReasonCategory";

export namespace IPageICommunityPlatformReportReasonCategory {
  /**
   * Paginated response wrapper for report reason category summaries.
   *
   * This schema defines the page envelope returned by the PATCH
   * `/communityPlatform/platformAdmin/reportReasonCategories` operation when
   * querying the `community_platform_report_reason_categories` table. It
   * pairs common pagination metadata with an array of
   * `ICommunityPlatformReportReasonCategory.ISummary` objects so that
   * moderation and safety tooling can present the current subset of report
   * reason categories in list form.
   *
   * The `pagination` property describes the slice of the overall result set,
   * while the `data` array contains the actual report reason categories that
   * match the request's filtering and sorting criteria for the selected
   * page.
   */
  export type ISummary = {
    /**
     * Pagination metadata describing the current page of report reason
     * categories.
     *
     * The structure is provided by `IPage.IPagination` and includes the
     * current page index, the configured limit per page, the total number
     * of matching rows in `community_platform_report_reason_categories`,
     * and the total number of pages. This enables administrative and
     * moderation tools to implement consistent paging behavior when
     * browsing the master list of report reasons.
     *
     * Clients typically rely on this information to show page counts,
     * disable or enable next/previous buttons, and construct follow-up
     * requests for additional pages of results.
     */
    pagination: IPage.IPagination;

    /**
     * List of report reason category summaries for the current page of
     * results.
     *
     * Each element is an `ICommunityPlatformReportReasonCategory.ISummary`
     * DTO, which provides a lightweight projection of a single row from the
     * `community_platform_report_reason_categories` Prisma model, including
     * its identifier, business code, display name, and key lifecycle
     * flags.
     *
     * This collection is the primary payload consumed by the PATCH
     * `/communityPlatform/platformAdmin/reportReasonCategories` endpoint,
     * allowing platform administrators and moderation tools to inspect,
     * search, and manage the standardized reasons offered to users when
     * reporting content or accounts.
     */
    data: ICommunityPlatformReportReasonCategory.ISummary[];
  };
}
