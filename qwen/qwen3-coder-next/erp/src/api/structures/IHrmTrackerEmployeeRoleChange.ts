import { tags } from "typia";

import { IHrmTrackerEmployee } from "./IHrmTrackerEmployee";
import { IHrmTrackerMember } from "./IHrmTrackerMember";
import { IHrmTrackerRole } from "./IHrmTrackerRole";

export namespace IHrmTrackerEmployeeRoleChange {
  /**
   * Request parameters for filtering employee role change audit records. Supports filtering by employee, actor, action type, and date range to enable targeted audit investigations.
   */
  export type IRequest = {
    /**
     * Employee ID to filter role change records.
     *
     * @x-autobe-database-schema-property hrm_tracker_employee_id
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.hrm_tracker_employee_id. UUID of the employee whose role changes are being filtered.
     */
    employee_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Actor ID to filter role change records.
     *
     * @x-autobe-database-schema-property hrm_tracker_member_id
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.hrm_tracker_member_id. UUID of the actor (member) who made the role change.
     */
    actor_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Type of role action to filter (e.g., role_assigned, role_changed).
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.action_type. Values: 'role_assigned', 'role_changed', 'role_removed', 'permissions_updated'.
     */
    action_type?: string | undefined;

    /**
     * Timestamp to filter role change events.
     *
     * @x-autobe-database-schema-property changed_at
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.changed_at. Date-time of the role change event.
     */
    changed_at?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Target page number to retrieve (1-indexed).
     *
     * @x-autobe-specification Query logic: pagination parameter for page number (1-indexed). Defaults to 1 if not provided.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page.
     *
     * @x-autobe-specification Query logic: pagination parameter for records per page. Defaults to 100 if not provided.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Summary representation of an employee role or permission change event for audit trail display.
   */
  export type ISummary = {
    /**
     * Unique identifier for the role or permission change event.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Employee whose role or permissions were changed.
     *
     * @x-autobe-database-schema-property employee
     * @x-autobe-specification Join via hrm_tracker_employee_id to hrm_tracker_employees.id. Returns IHrmTrackerEmployee.ISummary.
     */
    employee: IHrmTrackerEmployee.ISummary;

    /**
     * Member who performed the role or permission change.
     *
     * @x-autobe-database-schema-property actor
     * @x-autobe-specification Join via hrm_tracker_member_id to hrm_tracker_members.id. Returns IHrmTrackerMember.ISummary.
     */
    actor: IHrmTrackerMember.ISummary;

    /**
     * Previous role before the change, or null if not applicable.
     *
     * @x-autobe-database-schema-property oldRole
     * @x-autobe-specification Join via old_hrm_tracker_role_id to hrm_tracker_roles.id. Returns IHrmTrackerRole.ISummary or null for new employee or first role assignment.
     */
    oldRole: IHrmTrackerRole.ISummary | null;

    /**
     * New role after the change.
     *
     * @x-autobe-database-schema-property newRole
     * @x-autobe-specification Join via new_hrm_tracker_role_id to hrm_tracker_roles.id. Returns IHrmTrackerRole.ISummary.
     */
    newRole: IHrmTrackerRole.ISummary;

    /**
     * Type of action performed (e.g., role_assigned, role_changed, role_removed, permissions_updated).
     *
     * @x-autobe-database-schema-property action_type
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.action_type.
     */
    action_type: string;

    /**
     * Timestamp when the role or permission change occurred.
     *
     * @x-autobe-database-schema-property changed_at
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.changed_at.
     */
    changed_at: string & tags.Format<"date-time">;

    /**
     * IP address of the actor at the time of the change.
     *
     * @x-autobe-database-schema-property ip_address
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.ip_address.
     */
    ip_address: (string & tags.Format<"ipv4">) | null;

    /**
     * Timestamp when the audit record was created.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.created_at.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the audit record was last updated.
     *
     * @x-autobe-database-schema-property updated_at
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.updated_at.
     */
    updated_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when the audit record was soft-deleted, or null if active.
     *
     * @x-autobe-database-schema-property deleted_at
     * @x-autobe-specification Direct mapping from hrm_tracker_employee_role_changes.deleted_at. Nullable for active records.
     */
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
}
