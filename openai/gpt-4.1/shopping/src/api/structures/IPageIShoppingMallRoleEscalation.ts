import { IPage } from "./IPage";
import { IShoppingMallRoleEscalation } from "./IShoppingMallRoleEscalation";

export namespace IPageIShoppingMallRoleEscalation {
  /**
   * Paginated privilege and role escalation request list for platform-wide
   * governance compliance and admin action review.
   *
   * Represents a pageable set of summary records from
   * shopping_mall_role_escalations, tracking every request or action for
   * increased platform privilege. Used by administrative actors to review
   * escalation events, process compliance audits, and monitor governance
   * workflows. Each entry in the data array provides context for who
   * requested/influenced a change, status, timestamps, and traceability for
   * full audit of privilege lifecycle on the system.
   *
   * Crucial structure for regulatory and operational oversight, supporting
   * large-scale review and targeted queries in administrative and platform
   * compliance endpoints.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallRoleEscalation.ISummary[];
  };
}
