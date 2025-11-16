import { IPage } from "./IPage";
import { ICommunityPlatformAuditLog } from "./ICommunityPlatformAuditLog";

export namespace IPageICommunityPlatformAuditLog {
  /**
   * Paginated container of audit log summaries for platform administrators.
   *
   * This type represents a single page of results returned by the PATCH
   * `/communityPlatform/platformAdmin/auditLogs` endpoint and wraps audit log
   * entries stored in the `community_platform_audit_logs` table. The
   * `pagination` field provides page-level metadata (current index, page
   * size, total records, and total pages), while the `data` array carries the
   * `ICommunityPlatformAuditLog.ISummary` items for the current slice.
   *
   * Consumers such as security, compliance, and operations dashboards use
   * this schema to render tabular views of the audit trail, navigate through
   * large sequences of immutable events, and coordinate follow-up actions
   * like drilling into a specific audit record via its primary key.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the current slice of audit log results.
     *
     * This object follows the generic `IPage.IPagination` structure and
     * exposes information such as the current page index, page size, total
     * record count, and total page count.
     *
     * Clients use this metadata to drive paging controls in administrative
     * audit log views, especially when exploring very large
     * `community_platform_audit_logs` datasets.
     */
    pagination: IPage.IPagination;

    /**
     * List of audit log summary records for the requested page.
     *
     * Each element in this array is an
     * `ICommunityPlatformAuditLog.ISummary` DTO, which is directly mapped
     * to a single row from the `community_platform_audit_logs` Prisma model
     * and exposes key fields such as event type, event category, source
     * component, actor and target identifiers, and `created_at`.
     *
     * The array may be empty when the requested page falls beyond the
     * available data or when filters applied by
     * `ICommunityPlatformAuditLog.IRequest` match no audit events, but it
     * is always present when the page wrapper is returned.
     */
    data: ICommunityPlatformAuditLog.ISummary[];
  };
}
