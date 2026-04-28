import { tags } from "typia";

export namespace IHrmTimeTrackDepartmentReport {
  /**
   * Hierarchical department statistic containing department identification, employee count, and nested child departments for organizational analysis.
   *
   * This type represents a single department in the organizational hierarchy with its associated employee statistics. Each department includes its unique identifier, name, optional description, and the count of active employees assigned to it. The children array contains nested department statistics for sub-departments, enabling a complete tree view of the organizational structure.
   *
   * The hierarchical structure allows for multi-level department organization, where top-level departments contain their direct child departments, which in turn may contain their own children, forming a complete organizational tree.
   */
  export type IStatistic = {
    /**
     * Unique identifier for the department.
     *
     * This UUID identifies the department within the organization and is used to reference the department in other system operations.
     *
         * @x-autobe-specification Computed from hrm_time_track_departments.id.
         *   Unique identifier for the department within the organization,
         *   retrieved from the department record.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Name of the department.
     *
     * The human-readable name used to identify the department in the organizational structure and user interfaces.
     *
         * @x-autobe-specification Computed from
         *   hrm_time_track_departments.name. The display name of the department
         *   retrieved from the department record.
     */
    name: string;

    /**
     * Optional description of the department.
     *
     * Provides additional context about the department's purpose, responsibilities, and scope within the organization. May be null if no description has been provided.
     *
         * @x-autobe-specification Computed from
         *   hrm_time_track_departments.description. Nullable field containing
         *   additional information about the department's purpose and scope,
         *   retrieved from the department record.
     */
    description: string | null;

    /**
     * Number of active employees assigned to this department.
     *
     * This count includes only employees with active status (not soft-deleted) who are currently assigned to the department. The value is computed in real-time from the employee records and reflects the current workforce distribution.
     *
         * @x-autobe-specification Computed by COUNT(*) from
         *   hrm_time_track_employees where hrm_time_track_department_id matches
         *   the department id AND deleted_at IS NULL. Returns integer >= 0
         *   representing the number of active employees assigned to this
         *   department.
     */
    employee_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Nested child departments in the organizational hierarchy.
     *
     * Contains an array of sub-departments that report to this department. Each child department includes its own statistics and may contain further nested children, enabling a complete multi-level organizational tree view. Empty array if this department has no sub-departments.
     *
         * @x-autobe-specification Computed recursive array of
         *   IHrmTimeTrackDepartmentReport.IStatistic for all direct child
         *   departments. Built by querying hrm_time_track_departments where
         *   parent_department_id equals this department's id. Sorted
         *   alphabetically by name. Empty array if no child departments exist.
     */
    children: IHrmTimeTrackDepartmentReport.IStatistic[];
  };
}
