import { IPage } from "./IPage";
import { IShoppingMallAdminActionLog } from "./IShoppingMallAdminActionLog";

export namespace IPageIShoppingMallAdminActionLog {
  /**
   * Paginated search result of administrative action logs in the shopping
   * mall system for oversight, compliance auditing, and privileged operation
   * review.
   *
   * Designed to provide a navigable view of all privileged or sensitive
   * actions recorded on the platform, this format forms the backbone of
   * admin, auditor, and security review dashboards. Each page enables
   * reviewers to filter, sort, analyze, and document the audit history of
   * critical operations by admin actors, facilitating compliance with
   * regulatory mandates, incident response, and business process
   * defensibility.
   */
  export type ISummary = {
    /**
     * Pagination data with current page, limit per page, total logs, and
     * maximum pages available for this admin action log search result.
     * Controls navigation of the audit/compliance log record pages.
     *
     * Provides standardized structure for paged access to high-volume
     * privileged action logs, supporting compliance, security analysis, and
     * oversight. Matches the IPage.IPagination schema for uniform
     * navigation in investigative contexts.
     */
    pagination: IPage.IPagination;

    /**
     * List of admin action or privileged operation log summary records
     * included in the current page of results. Each item encapsulates a
     * significant audit event performed by a platform administrator (user
     * intervention, system change, role escalation, order override, etc.)
     * with timestamp, actor, type, and context information.
     *
     * These records support forensic investigations, compliance review, and
     * root-cause analysis of sensitive platform changes, serving as the
     * core primitive for audit trail dashboards and compliance reporting
     * workflows.
     */
    data: IShoppingMallAdminActionLog.ISummary[];
  };
}
