import { IPage } from "./IPage";
import { ICommunityPlatformGuestuserSession } from "./ICommunityPlatformGuestuserSession";

export namespace IPageICommunityPlatformGuestuserSession {
  /**
   * Paginated collection of guest user session summaries for a specific guest
   * actor.
   *
   * This wrapper DTO combines standard pagination metadata from
   * `IPage.IPagination` with an array of
   * `ICommunityPlatformGuestuserSession.ISummary` records. It is used as the
   * response body for administrative listing endpoints such as
   * `/communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions`,
   * where platform administrators inspect or audit the sessions stored in the
   * `community_platform_guestuser_sessions` Prisma model.
   *
   * The `pagination` property describes the current slice of the overall
   * result set (page number, page size, total records, and total pages),
   * while `data` carries the concrete session summaries for that slice.
   * Clients can rely on both properties always being present to drive paging
   * controls and render consistent tabular or list-based views of guest
   * session activity.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * Encapsulates the current page index, page size, total record count,
     * and total page count for this guest user session listing response.
     */
    pagination: IPage.IPagination;

    /**
     * List of guest user session summary records returned for the current
     * page.
     *
     * Each element is an `ICommunityPlatformGuestuserSession.ISummary`
     * instance representing a single tracked browsing or interaction
     * session belonging to the targeted guest user.
     */
    data: ICommunityPlatformGuestuserSession.ISummary[];
  };
}
