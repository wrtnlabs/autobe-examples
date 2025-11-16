import { IPage } from "./IPage";
import { ICommunityPlatformUserSecurityEvent } from "./ICommunityPlatformUserSecurityEvent";

export namespace IPageICommunityPlatformUserSecurityEvent {
  /**
   * Paginated collection of user security event summaries.
   *
   * This schema represents a single page in a larger result set of security
   * events queried from the `community_platform_user_security_events` table.
   * It is used in administrative and security-analytics endpoints such as
   * `/communityPlatform/platformAdmin/userSecurityEvents` and
   * `/communityPlatform/platformAdmin/securityEvents/auditTrail`, where
   * platform administrators need to browse and triage large volumes of
   * security telemetry.
   *
   * The `pagination` property describes how the current page fits into the
   * overall result set (current page index, page size, total records, and
   * total pages), while the `data` array contains the actual
   * `ICommunityPlatformUserSecurityEvent.ISummary` items for this slice.
   * Clients should rely on `pagination.records` and `pagination.pages` for UI
   * controls and use the `data` array to render lists, tables, or dashboards
   * of security events filtered by actor type, event type, account status, IP
   * address, and time range.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * This object encapsulates the paging state for the current slice of
     * user security event summaries, including the current page index, page
     * size limit, total number of records that match the query, and the
     * computed total number of pages. It allows clients to implement
     * classic numbered pagination or infinite scroll over the security
     * event stream.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * Each element in this array is an
     * `ICommunityPlatformUserSecurityEvent.ISummary` object, representing a
     * single summarized security event derived from the
     * `community_platform_user_security_events` Prisma model and related
     * subtype bindings (for example guest, member user, community
     * moderator, or platform admin events). These summaries focus on
     * identifiers, classification fields, timestamps, and high-level
     * context suitable for list views and dashboards, without exposing
     * heavy metadata payloads.
     */
    data: ICommunityPlatformUserSecurityEvent.ISummary[];
  };
}
