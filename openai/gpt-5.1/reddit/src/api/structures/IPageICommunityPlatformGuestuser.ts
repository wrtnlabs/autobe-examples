import { IPage } from "./IPage";
import { ICommunityPlatformGuestuser } from "./ICommunityPlatformGuestuser";

export namespace IPageICommunityPlatformGuestuser {
  /**
   * Paginated collection of guest user summaries derived from
   * `community_platform_guestusers`.
   *
   * This page wrapper combines generic pagination information from
   * `IPage.IPagination` with an array of
   * `ICommunityPlatformGuestUser.ISummary` entries. It is returned by
   * administrative search endpoints that list guest actors, enabling
   * security, abuse-prevention, and operational tools to navigate through
   * large sets of guest users while maintaining a clear understanding of
   * result size and position.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the guest user search results.
     *
     * This object conforms to `IPage.IPagination` and describes the current
     * page index (`current`), the maximum number of rows per page
     * (`limit`), the total number of guest user records that match the
     * applied filters (`records`), and the total number of pages (`pages`).
     * Administrative dashboards and tooling rely on these values to
     * implement paging controls when exploring large volumes of guest user
     * tracking data.
     */
    pagination: IPage.IPagination;

    /**
     * Array of guest user summary records for the current page.
     *
     * Each item is an `ICommunityPlatformGuestUser.ISummary` DTO derived
     * from a row in the `community_platform_guestusers` table, optionally
     * enriched with a related account status summary. The collection is
     * intended for platform administrators and security analysts who need
     * to review guest activity, correlate patterns of abuse, or drill down
     * into individual guest records and their sessions.
     */
    data: ICommunityPlatformGuestuser.ISummary[];
  };
}
