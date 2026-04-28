import { tags } from "typia";

import { IHrmPlatformDepartment } from "./IHrmPlatformDepartment";

export namespace IHrmPlatformDepartmentSnapshot {
  /**
   * A summary representation of a department configuration snapshot, capturing the state of a department at a specific point in time.
   *
   * Snapshots are automatically created when department details (name, description, or hierarchy) change, providing an immutable audit trail for compliance and organizational history reconstruction. Each snapshot contains denormalized copies of department attributes valid at the time of capture.
   */
  export type ISummary = {
    id: string & tags.Format<"uuid">;
    department: IHrmPlatformDepartment.ISummary;
    parentDepartment: IHrmPlatformDepartment.ISummary | null;
    snapshotName: string;
    snapshotDescription: string | null;
    createdAt: string & tags.Format<"date-time">;
  };

  /**
   * Request parameters for searching and listing department configuration snapshots.
   *
   * Filter department snapshots by department, date range of snapshot creation, and text search on department names as they existed at the time of each snapshot. Results are page-paginated and sorted by most recent snapshots first.
   *
   * All parameters are optional — omit all filters to retrieve the most recent snapshots with default pagination.
   */
  export type IRequest = {
    /**
     * Start of date range filter for snapshot creation time (inclusive).
     *
     * Only returns snapshots created at or after this timestamp. Combine with createdAtTo to filter snapshots within a specific time window. Uses ISO 8601 date-time format.
     *
     * @title Created From
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Maps to
         *   hrm_platform_department_snapshots.created_at column as range start
         *   boundary. Used in SQL WHERE created_at >= createdAtFrom. Inclusive
         *   lower bound for temporal filtering of snapshot creation timestamps.
     */
    createdAtFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End of date range filter for snapshot creation time (inclusive).
     *
     * Only returns snapshots created at or before this timestamp. Combine with createdAtFrom to filter snapshots within a specific time window. Uses ISO 8601 date-time format.
     *
     * @title Created To
         * @x-autobe-database-schema-property created_at
         * @x-autobe-specification Maps to
         *   hrm_platform_department_snapshots.created_at column as range end
         *   boundary. Used in SQL WHERE created_at <= createdAtTo. Inclusive
         *   upper bound for temporal filtering of snapshot creation timestamps.
     */
    createdAtTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter snapshots to a specific department by its UUID.
     *
     * Only returns snapshots belonging to the given department. The department must belong to the authenticated member's current organization context. Uses UUID format.
     *
     * @title Department Id
         * @x-autobe-database-schema-property hrm_platform_department_id
         * @x-autobe-specification Maps to
         *   hrm_platform_department_snapshots.hrm_platform_department_id
         *   column. UUID equality filter. Organization scope validation: ensure
         *   the referenced department belongs to the member's active
         *   organization context before querying snapshots.
     */
    departmentId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Number of results per page. Minimum 1, maximum 100. Defaults to 20.
     *
     * Controls how many snapshot records are returned in a single page of results. Adjust this value to balance between response payload size and the number of API calls needed to browse all snapshots.
     *
     * @title Limit
         * @x-autobe-specification Pagination parameter for query result
         *   limiting. Applies LIMIT clause to the SQL query. Validated range:
         *   1-100. Defaults to 20 when not provided. Works with page parameter
         *   for offset-based pagination.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Page number for pagination. Minimum 1. Defaults to 1.
     *
     * Specifies which page of results to retrieve. Page numbering starts from 1 (not 0). Combine with limit to navigate through paginated snapshot results.
     *
     * @title Page
         * @x-autobe-specification Pagination parameter for result offset
         *   calculation. Applies OFFSET clause computed as (page - 1) * limit.
         *   Minimum value is 1. Defaults to 1 when not provided. Works with
         *   limit parameter for offset-based pagination.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Search term to match against snapshot names (denormalized department names at time of snapshot).
     *
     * Performs text search using GIN trigram index for efficient partial matching. Returns snapshots where the denormalized department name contains the search term. Case-insensitive matching.
     *
     * @title Search
         * @x-autobe-database-schema-property snapshot_name
         * @x-autobe-specification Maps to
         *   hrm_platform_department_snapshots.snapshot_name column for text
         *   search. Uses GIN trigram index (gin__gin_trgm_ops) for efficient
         *   partial string matching. Implements ILIKE or @@ operator with
         *   gin_trgm_ops. Case-insensitive. Returns snapshots where the
         *   denormalized department name at snapshot time contains the search
         *   term.
     */
    search?: string | undefined;
  };
}
