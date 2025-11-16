import { IPage } from "./IPage";
import { ICommunityPlatformMemberuserSession } from "./ICommunityPlatformMemberuserSession";

export namespace IPageICommunityPlatformMemberuserSession {
  /**
   * Paginated result wrapper for member user session summaries associated
   * with a single account.
   *
   * This type represents the response body of the PATCH
   * `/communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions`
   * operation and encapsulates both pagination metadata and a list of
   * `ICommunityPlatformMemberuserSession.ISummary` records. It is backed by
   * the `community_platform_memberuser_sessions` Prisma model, scoped by the
   * parent member user identified in the request path.
   *
   * Platform administrators and security operators use this structure to
   * review active and historical authenticated sessions for a specific member
   * user, navigate through large result sets, and correlate session-level
   * information with broader security events or moderation actions. The page
   * wrapper itself is purely a transport construct and does not introduce
   * additional business fields beyond pagination and the collection of
   * session summaries.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of member user sessions.
     *
     * This object follows the shared `IPage.IPagination` structure, where
     * `current` represents the zero-based page index, `limit` is the
     * maximum number of session records returned per page, `records` is the
     * total number of matching session rows in
     * `community_platform_memberuser_sessions` for the scoped member user,
     * and `pages` is the total number of pages computed using ceiling
     * division of `records` by `limit`.
     *
     * Client applications use this information to construct paging controls
     * (next/previous page navigation, page counts) when browsing the
     * session history of a specific member user via the administrative
     * endpoint
     * `/communityPlatform/platformAdmin/memberUsers/{memberUserId}/sessions`.
     * The values are always computed for the filtered result set implied by
     * the request criteria, not for all sessions in the system.
     */
    pagination: IPage.IPagination;

    /**
     * Ordered collection of member user session summary records for the
     * current page.
     *
     * Each element in this array is an
     * `ICommunityPlatformMemberuserSession.ISummary` DTO derived from a row
     * in the `community_platform_memberuser_sessions` Prisma model that
     * belongs to the member user identified by the `memberUserId` path
     * parameter. The summary exposes key session attributes such as
     * identifiers, IP address, entry URL, referrer, and creation and
     * expiration timestamps, without leaking internal implementation
     * details.
     *
     * This array typically represents the subset of sessions that match the
     * search and filter criteria contained in
     * `ICommunityPlatformMemberuserSession.IRequest`, after applying
     * pagination rules described by the `pagination` field. The order of
     * entries is usually defined by creation or activity timestamps so that
     * recent or most relevant sessions appear first in administrative and
     * security-review UIs.
     */
    data: ICommunityPlatformMemberuserSession.ISummary[];
  };
}
