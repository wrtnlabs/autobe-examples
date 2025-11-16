import { IPage } from "./IPage";
import { IShoppingMallAdminSession } from "./IShoppingMallAdminSession";

export namespace IPageIShoppingMallAdminSession {
  /**
   * Paginated admin session log records for audit, compliance, and security
   * review workflows.
   *
   * Represents a page of summarized records from the shopping mall admin
   * session logs, with each entry capturing critical session metadata (IP,
   * referrer, entry URL, timestamps). Enables authorized administrative
   * actors to browse, search, and analyze administrator session activity with
   * full traceability. This type is essential for helpdesk operations, threat
   * analysis, and platform-wide internal investigations where compliance and
   * user accountability are required.
   *
   * Implements robust pagination and data structure for extremely large
   * recordsets, supporting efficient review and reporting in all
   * administrator-facing audit/provenance scenarios.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallAdminSession.ISummary[];
  };
}
