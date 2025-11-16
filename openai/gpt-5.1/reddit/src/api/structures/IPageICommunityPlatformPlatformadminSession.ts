import { IPage } from "./IPage";
import { ICommunityPlatformPlatformadminSession } from "./ICommunityPlatformPlatformadminSession";

export namespace IPageICommunityPlatformPlatformadminSession {
  /**
   * Paginated list of platform administrator session summaries.
   *
   * This schema represents the standard page container returned by the
   * platform administrator sessions index operation, which queries the
   * `community_platform_platformadmin_sessions` Prisma model for a specific
   * administrator. It bundles together high-level pagination metadata and a
   * collection of `ICommunityPlatformPlatformAdminSession.ISummary` items so
   * that administrative UIs and security dashboards can efficiently render
   * lists of active and historical admin sessions.
   *
   * The `pagination` property describes how the results are segmented into
   * pages (current page, page size, total records, and total pages), while
   * the `data` property holds the actual session summary rows for the current
   * page. This structure is used to support filtered, searchable, and
   * sortable views of admin sessions, allowing platform administrators to
   * review login activity, identify suspicious sessions, and correlate
   * session timelines with entries in
   * `community_platform_user_security_events` and related audit-log tables.
   */
  export type ISummary = {
    /**
     * Pagination information for the current slice of platform
     * administrator session data.
     *
     * This object mirrors the generic pagination metadata used across the
     * API and typically includes the current page index, page size limit,
     * total number of matching records, and total number of available
     * pages. It is computed from the query parameters in
     * `ICommunityPlatformPlatformAdminSession.IRequest` and the underlying
     * `community_platform_platformadmin_sessions` table so that clients can
     * build stable, user-friendly paginated views.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of platform administrator session summaries returned for
     * the requested page.
     *
     * Each element is an `ICommunityPlatformPlatformAdminSession.ISummary`
     * record, which provides a lightweight view over a single row from the
     * `community_platform_platformadmin_sessions` Prisma model combined
     * with the owning admin account. The list may be empty when no sessions
     * match the supplied filters, but the array itself is always present so
     * clients can safely iterate without null checks.
     */
    data: ICommunityPlatformPlatformadminSession.ISummary[];
  };
}
