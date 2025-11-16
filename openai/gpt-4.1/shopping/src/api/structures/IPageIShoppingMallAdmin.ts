import { IPage } from "./IPage";
import { IShoppingMallAdmin } from "./IShoppingMallAdmin";

export namespace IPageIShoppingMallAdmin {
  /**
   * A single paginated collection of administrator account summaries,
   * returned by admin index/search API endpoints.
   *
   * This schema is pivotal in platform governance and compliance. It is used
   * for rendering lists of admin accounts in dashboards, supporting
   * governance workflows (such as privilege audit, periodic admin review, and
   * root/admin communications), and providing a scalable, auditable interface
   * for privileged user management. The structure supports both fine-grained
   * audit requirements and efficient user navigation across potentially large
   * admin datasets.
   */
  export type ISummary = {
    /**
     * Pagination context for administrator result sets.
     *
     * This property captures the current page, page size, result count, and
     * total page count for admin registry searches. It forms the foundation
     * for scalable admin management screens, allowing auditors and
     * governance stakeholders to efficiently page through large admin user
     * lists.
     *
     * Proper pagination is essential for audit logs, root privilege
     * management, and ensuring performant admin search/oversight workflows
     * in large platforms subject to regulatory review.
     */
    pagination: IPage.IPagination;

    /**
     * Summary list of administrator account records included in this page
     * of results.
     *
     * Each item is an IShoppingMallAdmin.ISummary, representing a distinct
     * platform administrator (name, email, ID only). This array is used to
     * render admin search results, perform privileged access audits, and
     * drive mass-update or notification tools for governance.
     *
     * Proper use of this property ensures administrators and compliance
     * actors have a clear, paginated view of platform privileged users,
     * supporting both day-to-day management and audit readiness.
     */
    data: IShoppingMallAdmin.ISummary[];
  };
}
