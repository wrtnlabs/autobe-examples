import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingDepartment } from "../../../../api/structures/IErpHrmTimeTrackingDepartment";
import { IPageIErpHrmTimeTrackingDepartment } from "../../../../api/structures/IPageIErpHrmTimeTrackingDepartment";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmTimeTrackingMemberDepartmentsDepartmentId } from "../../../../providers/deleteErpHrmTimeTrackingMemberDepartmentsDepartmentId";
import { getErpHrmTimeTrackingMemberDepartmentsDepartmentId } from "../../../../providers/getErpHrmTimeTrackingMemberDepartmentsDepartmentId";
import { patchErpHrmTimeTrackingMemberDepartments } from "../../../../providers/patchErpHrmTimeTrackingMemberDepartments";
import { postErpHrmTimeTrackingMemberDepartments } from "../../../../providers/postErpHrmTimeTrackingMemberDepartments";
import { putErpHrmTimeTrackingMemberDepartmentsDepartmentId } from "../../../../providers/putErpHrmTimeTrackingMemberDepartmentsDepartmentId";

@Controller("/erpHrmTimeTracking/member/departments")
export class ErphrmtimetrackingMemberDepartmentsController {
  /**
   * Create a new department within the currently selected organization.
   *
   * This operation allows an authorized member to create an organizational unit used to organize employees inside the selected organization context. A department requires a name and may optionally include a description. The department can also optionally reference a parent department to form a small hierarchy (the system supports only the allowed nesting depth).
   *
   * While handling the request, the system enforces organization context isolation: when creating a department, the department (and any referenced parent department) must belong to the member’s currently selected organization. If a provided parent department belongs to a different organization, the create request is rejected to prevent cross-organization access.
   *
   * The system also validates structural correctness for the parent relationship. If the requested parent assignment would produce an invalid hierarchy depth/shape, the system rejects the operation and leaves department data unchanged.
   *
   * Permissions: department creation is restricted to users who have the organization management authority within the currently selected organization (org:manage). Users without that capability are denied.
   *
   * After successful creation, the newly created department becomes immediately available in the organization’s department list so subsequent department filtering and list browsing reflect the updated structure.
   *
   * Related usage: clients typically call the departments list/read endpoint to display available departments; right after this create call succeeds, the new department should appear there.
   *
   *
   * @param connection
   * @param body Department creation payload for the currently selected organization. The request requires a department name and may include an optional description and an optional parent department reference (which must belong to the same organization and satisfy the allowed nesting structure).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implementation steps for creating a department:
   *
   * 1) Authorization & context
   * - Resolve the current organization context from the authenticated member/session (selected organization).
   * - Verify the caller has the organization management permission (org:manage) for that selected organization.
   * - Enforce context isolation: the created department must use erp_hrm_time_tracking_departments.erp_hrm_time_tracking_organization_id = selectedOrganization.id.
   *
   * 2) Validate request payload
   * - Validate required fields for the Department create request DTO (name required; description optional; parent_department_id optional).
   * - If parent_department_id is provided:
   *   - Load the parent department by id.
   *   - Ensure parent.erp_hrm_time_tracking_organization_id == selectedOrganization.id. If not, reject the request.
   *   - Validate nesting depth constraint: detect whether linking this department to the parent would create an invalid parent structure (more than one nesting level as defined by requirements). If invalid, reject the request.
   *
   * 3) Uniqueness within organization
   * - Enforce the database unique constraint: @@unique([erp_hrm_time_tracking_organization_id, name]).
   * - If another non-deleted department in the same organization already has the same name, reject with an appropriate validation error.
   *
   * 4) Create transaction
   * - In a transaction, insert into erp_hrm_time_tracking_departments:
   *   - id: generated UUID by the database/ORM.
   *   - erp_hrm_time_tracking_organization_id: selectedOrganization.id.
   *   - parent_department_id: request.parent_department_id or null.
   *   - name: request.name.
   *   - description: request.description.
   *   - created_at / updated_at: set by server/ORM.
   *   - deleted_at: set to null on creation.
   *
   * 5) Response
   * - Return the created department mapped to IErpHrmTimeTrackingDepartment.
   * - Ensure timestamps and resolved parent references (if any) are consistent with what was stored.
   *
   * Edge cases
   * - Parent id provided but not found: reject.
   * - Parent belongs to different organization: reject.
   * - Invalid nesting scenario: reject without inserting.
   * - Name uniqueness conflict within the same organization: reject.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingDepartment.ICreate,
  ): Promise<IErpHrmTimeTrackingDepartment> {
    try {
      return await postErpHrmTimeTrackingMemberDepartments({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of departments for the currently selected organization.
   *
   * This endpoint supports department browsing within an organization-scoped HR structure, reflecting the department hierarchy that employees and organization managers manage. The returned list is derived from the erp_hrm_time_tracking_departments table, which stores each department’s organization ownership (erp_hrm_time_tracking_organization_id), optional parent department reference (parent_department_id), display name (name), and free-text description (description).
   *
   * Security and authorization are applied at execution time: while operating in a selected organization context, all department operations must apply only to the data of that organization, preventing cross-organization access if the context does not match the target department’s organization. Requests from users who are not properly authorized for department browsing still must not reveal other organizations’ department data.
   *
   * Filtering behavior is designed for UI list browsing. The operation accepts search criteria (e.g., name keyword) and supports pagination and sorting. When the selected organization has no departments, the system must return an empty list state scoped to that organization (and must not error or fabricate placeholder departments).
   *
   * Returned department summary items should include the department identifiers and core display fields needed for list rendering, while avoiding unnecessary nested data. Hierarchy information (such as the presence of a parent department) may be included in summary form, based on what the corresponding ISummary DTO exposes.
   *
   * Related operations: administrators can modify individual department details using the department edit APIs, and users can view the department list using this operation as their primary browsing mechanism. If a user edits a department, subsequent calls to this endpoint must reflect the latest name/description values for that organization.
   *
   * @param connection
   * @param body Search criteria and pagination options for department list browsing within the selected organization.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification Implement PATCH /departments as a list/search
     *   over erp_hrm_time_tracking_departments.
   *
   * 1) Resolve organization scope from the authenticated member’s currently selected organization context.
   *    - All queries must filter by erp_hrm_time_tracking_organization_id = selectedOrganizationId.
   *    - Never return departments from other organizations.
   *
   * 2) Apply deletion handling per schema: only include active rows (deleted_at IS NULL).
   *
   * 3) Apply request search filters:
   *    - Use request DTO fields (IErpHrmTimeTrackingDepartment.IRequest) for keyword matching on name and optional filtering on parent_department_id and description if present.
   *    - Ensure filters do not break org isolation.
   *
   * 4) Pagination and sorting:
   *    - Apply pagination and sorting from the request DTO.
   *    - Query returns a page of departments and a total count for pagination metadata.
   *
   * 5) Mapping:
   *    - Map database rows to IErpHrmTimeTrackingDepartment.ISummary (or the exact generated type corresponding to that name variant) including id, name, description (if included in ISummary), parent_department_id (if included in ISummary), and timestamps as available.
   *
   * 6) Edge cases:
   *    - If there are no matching departments, return an empty page.
   *    - Validate any provided parent_department_id filter is treated as a filter only (no cross-org resolution/validation should be attempted in a list call).
   *
   * 7) Transactionality:
   *    - No write operations; no transaction required beyond consistent read.
   *
   * 8) Error handling:
   *    - If organization context is missing/invalid per auth middleware, reject accordingly (handled upstream). For this operation, rely on auth layer to guarantee a valid selected organization context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingDepartment.IRequest,
  ): Promise<IPageIErpHrmTimeTrackingDepartment.ISummary> {
    try {
      return await patchErpHrmTimeTrackingMemberDepartments({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single department record by its identifier within the currently selected organization context.
   *
   * This operation returns the department’s core profile fields used by the UI and business logic: the department name and optional description. Because departments are organized hierarchically, the response also supports the optional parent-department relationship, enabling clients to render nested department structures (one level of nesting) inside the same organization.
   *
   * Authorization and context are enforced via the selected organization scope: every department belongs to exactly one organization, and this endpoint must prevent cross-organization access. If the authenticated member does not have access to the currently selected organization, or if the requested department belongs to a different organization than the active context, the system must reject the request.
   *
   * The underlying database model stores the department’s organization id (erp_hrm_time_tracking_organization_id), name, optional parent_department_id, and a deleted_at timestamp. The operation must therefore only return records that are valid for the active browsing context; records marked as deleted must not be returned as active department details.
   *
   * Clients typically pair this operation with the department list browsing endpoint to allow users to select a department and then view its details. For editing or deletion, dedicated write operations are expected to be used instead of this read endpoint.
   *
   * @param connection
   * @param departmentId Target department identifier (UUID) within the active organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Authenticate the caller (guest access should
     *   be denied for this protected domain operation per actor/session rules).
   *
   * 2) Resolve the active organization context for the authenticated member (the organization selected by the user in the current session/context).
   *
   * 3) Validate path parameter `departmentId` is a UUID.
   *
   * 4) Fetch the department from erp_hrm_time_tracking_departments where id = departmentId AND erp_hrm_time_tracking_organization_id = activeOrganizationId.
   *    - If no row matches, return a not-found / access-denied style error (implementation should not reveal whether the id exists in another organization).
   *
   * 5) Ensure only active records are returned:
   *    - If deleted_at is not null, treat as not found for the purpose of this read operation.
   *
   * 6) Map database fields to the response DTO:
   *    - id
   *    - name
   *    - description (nullable)
   *    - parentDepartmentId (nullable; derived from parent_department_id)
   *    - createdAt / updatedAt as defined by the department DTO schema
   *
   * 7) Do not compute or return childDepartments here; this is a single-resource read.
   *
   * 8) Optionally (if DTO includes parent summary fields) join parent department to include its id and name; do not expand grandchildren beyond what the DTO supports.
   *
   * 9) No database transaction is required (read-only).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":departmentId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingDepartment> {
    try {
      return await getErpHrmTimeTrackingMemberDepartmentsDepartmentId({
        member,
        departmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a department within the currently selected organization context.
   *
   * This operation modifies the persisted data for a single department identified by `departmentId`, including its required `name` and optional `description`, and it may also change the department’s optional `parent_department_id` to adjust the one-level hierarchy inside the same organization. Departments are organization-scoped: every department record belongs to exactly one organization via `erp_hrm_time_tracking_organization_id`, so the update must never cross organization boundaries.
   *
   * The system must enforce organization-scoped access during the update. While operating in a selected organization context, the system applies department operations only to the data of that organization, preventing attempts to update a department using a mismatched context.
   *
   * Hierarchy validation is required when changing the parent relationship. A department may reference an optional parent department via `parent_department_id` only within the same organization. The system must detect invalid parent structures during creation and editing; an invalid parent structure includes any attempt that would result in more than one level of nesting when interpreted across the referenced departments. If such an invalid parent structure is detected, the system rejects the change and leaves the existing department data unchanged.
   *
   * Time fields are maintained by the persistence layer. The department table includes `created_at` and `updated_at`; this operation updates `updated_at` to reflect the modification time while preserving `created_at`.
   *
   * This operation is intended to be used alongside:
   * - The department list browsing operation to discover department ids and current hierarchy for the selected organization.
   * - The department detail retrieval operation to view a department before editing its `name`, `description`, or parent assignment.
   *
   * On success, this endpoint returns the updated department entity. On validation failures (e.g., parent department from a different organization, or invalid nesting depth), the system rejects the request without partially applying changes.
   *
   * @param connection
   * @param departmentId Target department id to update (UUID).
   * @param body Updated department fields. The system will validate organization-scoped parent relationships and enforce at most one level of nesting.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Authorization & context validation - Resolve
     *   the requesting actor and ensure the operation is permitted to manage
     *   departments in the currently selected organization context (org:manage
     *   as specified for department write permissions). - Load target
     *   department by id from `erp_hrm_time_tracking_departments`. - Verify the
     *   loaded department’s `erp_hrm_time_tracking_organization_id` equals the
     *   selected organization id from the session/context. If mismatch, reject
     *   to prevent cross-organization access.
   *
   * 2) Input validation
   * - Validate request body fields against schema expectations:
   *   - `name` is required (non-empty as enforced by DTO validation layer).
   *   - `description` may be null/omitted in DTO (maps to nullable `description` column).
   *   - `parentDepartmentId` (if provided) maps to `parent_department_id`.
   * - If `parent_department_id` is provided/changed:
   *   - If it is non-null, load the referenced parent department and verify it belongs to the same organization (`erp_hrm_time_tracking_organization_id`). Reject if not.
   *   - Enforce one-level nesting: verify that the target parent does not have a parent of its own (i.e., proposed parent must not create nesting deeper than one level). Reject the update if it would cause more than one level of nesting.
   *   - Reject any scenario that represents an invalid parent structure per the requirements; apply no partial changes.
   *
   * 3) Transaction and persistence
   * - Begin transaction.
   * - Apply updates to `erp_hrm_time_tracking_departments`:
   *   - Set `name`, `description` (nullable), and `parent_department_id` (nullable) according to request.
   *   - Update `updated_at` to current time.
   *   - Do not alter `created_at`.
   * - Commit transaction.
   *
   * 4) Activity/audit integration (if applicable)
   * - If the service records activity log entries for department edits, create an `erp_hrm_time_tracking_activity_log_entries` record referencing the updated department and performed-by user. (If no such cross-cutting logging exists in implementation, skip.)
   *
   * 5) Response
   * - Return the updated department entity after persistence, including its id, organization id, optional parent department id, name, description, created_at, updated_at, and deleted_at state as defined by the department DTO.
   *
   * 6) Edge cases
   * - If the department id does not exist, return not-found.
   * - If the parent change fails validation (wrong organization or invalid nesting depth), return a validation error and ensure the original department remains unchanged.
   * - Ensure that attempting to update a record that is already marked deleted (non-null `deleted_at`) follows the service’s existing behavior; if such behavior is not defined, treat it as not-found or reject consistently with other department operations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":departmentId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingDepartment.IUpdate,
  ): Promise<IErpHrmTimeTrackingDepartment> {
    try {
      return await putErpHrmTimeTrackingMemberDepartmentsDepartmentId({
        member,
        departmentId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a department from the currently selected organization.
   *
   * This operation deletes the target `erp_hrm_time_tracking_departments` record that belongs to the authenticated member’s currently selected organization context. When a department is removed from an organization’s structure, the system preserves employees by clearing their department reference (employees’ department association is set to `null`) instead of deleting employee records.
   *
   * The operation enforces organization-scoped authorization: only a user with organization management authority for the currently selected organization may perform department deletion. If the department does not exist within the selected organization context, or the caller lacks authority, the system rejects the request without changing any department or employee data.
   *
   * After successful deletion, the deleted department must no longer appear in the department list for that organization, and its details must not be retrievable. Employees remain available in the employee directory per their current assignment state; the only change is that the department information for employees previously assigned to the deleted department is no longer present.
   *
   * This behavior is defined by the department deletion requirements: deletion clears employee department assignments, preserves employee historical employment identity and all related time data (timelogs and timesheets), and does not remove projects, tasks, or their time records.
   *
   * Related operations: combine with the departments list and employee views to confirm that the department is filtered out and that affected employees now show a `null` department assignment.
   *
   * @param connection
   * @param departmentId The UUID identifier of the department to permanently remove within the currently selected organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1) Authorization & scope - Resolve current
     *   organization context from the authenticated member/session. - Verify
     *   caller has organization owner authority to manage organization data in
     *   the selected organization context (owner-only authority for department
     *   create/edit/delete). - If the caller lacks permission, reject with an
     *   authorization/permission error before any DB changes.
   *
   * 2) Validate target department
   * - Load the department row by `id = departmentId` from `erp_hrm_time_tracking_departments`.
   * - If not found, reject with not-found (no DB modifications).
   * - Ensure the loaded department’s `erp_hrm_time_tracking_organization_id` matches the current organization context. If it does not match, reject (do not disclose cross-tenant existence).
   *
   * 3) Transactional deletion + employee reference clearing
   * - Start a DB transaction.
   * - Delete the department row from `erp_hrm_time_tracking_departments`.
   * - Clear department assignment for all employees currently referencing the deleted department:
   *   - Update the employees table to set the employees’ department reference column to `null` for rows where their department reference equals the deleted department id.
   *   - This must happen within the same transaction to avoid leaving employees in a broken state.
   * - Commit the transaction.
   *
   * 4) Post-conditions
   * - Department list endpoints must no longer return the deleted department for this organization.
   * - Employees remain in the organization and remain visible in employee directory views; their department association is now null.
   *
   * 5) Edge cases
   * - If there are no employees referencing the department, deletion still succeeds.
   * - Never delete or cascade into employee records; ensure only the employee department reference is cleared.
   * - Never partially apply: if any step fails, roll back the transaction so employee references and department data remain consistent.
   *
   * 6) Activity/audit integration (if present in the service layer)
   * - Optionally record an organization-scoped activity log entry capturing that a department was erased, including the acting user, timestamp, and target entity id/type. This must not affect the deletion outcome if the logging mechanism is best-effort.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":departmentId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("departmentId")
    departmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingMemberDepartmentsDepartmentId({
        member,
        departmentId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
