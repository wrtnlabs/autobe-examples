import { tags } from "typia";

import { IHrmTimeTrackingEmployee } from "./IHrmTimeTrackingEmployee";

export namespace IHrmTimeTrackingProjectMembership {
  /**
   * A lightweight project membership record used when listing the members assigned to a project. It exposes the membership ID, the linked employee summary, whether the member is a project lead, and the record timestamps, while the project itself is implied by the request context.
   */
  export type ISummary = {
    /**
     * Unique identifier of the project membership record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_time_tracking_project_memberships.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * The employee assigned to this project.
     *
     * @x-autobe-database-schema-property employee
     * @x-autobe-specification Resolve the employee relation from hrm_time_tracking_project_memberships.employee via hrm_time_tracking_employee_id and serialize it as IHrmTimeTrackingEmployee.ISummary.
     */
    employee: IHrmTimeTrackingEmployee.ISummary;

    /**
     * Whether the employee has project-lead authority in this membership.
     *
     * @x-autobe-database-schema-property is_project_lead
     * @x-autobe-specification Direct mapping from hrm_time_tracking_project_memberships.is_project_lead.
     */
    isProjectLead: boolean;

    /**
     * Timestamp when this membership was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from hrm_time_tracking_project_memberships.created_at.
     */
    createdAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this membership was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from hrm_time_tracking_project_memberships.updated_at.
     */
    updatedAt: string & tags.Format<"date-time">;

    /**
     * Timestamp when this membership was soft deleted, or null if it is active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from hrm_time_tracking_project_memberships.deleted_at. Preserve null when the membership has not been soft deleted.
     */
    deletedAt: (string & tags.Format<"date-time">) | null;
  };

  /**
   * Search, pagination, and sorting criteria for browsing the employees assigned to a specific project. The project context comes from the path parameter, while this body controls how the member list is filtered, ordered, and capped.
   */
  export type IRequest = {
    /**
     * Page number to retrieve for the project member list.
     *
     * @x-autobe-specification Use as the 1-indexed page number for project membership browsing. The service translates this into offset-based pagination over hrm_time_tracking_project_memberships in the current project context.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of project members to return per page.
     *
     * @x-autobe-specification Use as the number of records requested per page for the project membership query. The service applies it when building the paginated list response and may enforce an upper bound.
     */
    pageSize?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Free-text search term used to filter project members.
     *
     * @x-autobe-specification Apply free-text matching against employee-facing fields exposed through the project membership join, such as employee name, email, position title, or role label where available. It is used only for filtering the current project member list.
     */
    search?: string | undefined;

    /**
     * Sorting rule for the project member list.
     *
     * @x-autobe-specification Use to control deterministic ordering of project membership results. The implementation should interpret the value as a sorting directive for the paginated project member query and preserve stable ordering across pages.
     */
    sort?: string | undefined;

    /**
     * Optional maximum number of project members to return per page.
     *
     * @x-autobe-specification Use as an optional maximum number of records to return in the response page. If omitted or null, the service may apply its default page cap. This value only constrains the current project member list query.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };
}
