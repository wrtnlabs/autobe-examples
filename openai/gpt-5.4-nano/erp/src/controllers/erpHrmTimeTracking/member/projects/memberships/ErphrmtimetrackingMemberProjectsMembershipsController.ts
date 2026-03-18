import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingProjectMembership } from "../../../../../api/structures/IErpHrmTimeTrackingProjectMembership";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId } from "../../../../../providers/deleteErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId";
import { getErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId } from "../../../../../providers/getErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId";
import { patchErpHrmTimeTrackingMemberProjectsProjectIdMemberships } from "../../../../../providers/patchErpHrmTimeTrackingMemberProjectsProjectIdMemberships";
import { postErpHrmTimeTrackingMemberProjectsProjectIdMemberships } from "../../../../../providers/postErpHrmTimeTrackingMemberProjectsProjectIdMemberships";
import { putErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId } from "../../../../../providers/putErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId";

@Controller("/erpHrmTimeTracking/member/projects/:projectId/memberships")
export class ErphrmtimetrackingMemberProjectsMembershipsController {
  /**
   * Create an assignment that links an employee to a project for the selected organization context.
   *
   * This endpoint creates a single row in `erp_hrm_time_tracking_project_memberships`, where the target project is determined by the `projectId` path parameter and the employee to be assigned is provided in the request body. The membership records a `membership_role` value that drives project-scoped responsibility and UI behavior (for example, distinguishing project-lead vs member behavior within that specific project).
   *
   * During creation, the service must validate organization scoping by ensuring the referenced employee belongs to the same organization context as the target project. This enforces tenant isolation and prevents cross-organization assignments.
   *
   * Authorization and validation rules:
   * Only users with project management capability should be allowed to assign employees to projects. The service must ensure the requested assignment is valid for the target project and employee, and must prevent creation conflicts for the same `(project_id, employee_id)` pair as defined by the membership persistence rules.
   *
   * The system records the assignment as an auditable action in the activity log so that organization owners can review membership changes.
   *
   * Error handling expectations:
   * - Reject the request if the caller lacks the required project management capability.
   * - Reject if the `projectId` does not identify an accessible project in the selected organization context.
   * - Reject if the `employeeId` does not belong to an employee eligible within the selected organization context.
   * - Reject on duplication conflict for an existing membership entry for the same project and employee.
   *
   * Related operations commonly used together:
   * - Project retrieval to display project details and confirm context.
   * - Employee-project listing driven by existing `erp_hrm_time_tracking_project_memberships` rows to confirm the assignment result.
   *
   * @param connection
   * @param projectId Target project identifier to which the employee will be assigned.
   * @param body Creation payload for assigning an employee to a project, including the employee identifier and the membership role used to drive project-scoped responsibility.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1) Extract `projectId` from path and load `erp_hrm_time_tracking_projects` by `id`.
   *    - If the project does not exist, throw not-found.
   *    - Determine the selected organization scope from `project.erp_hrm_time_tracking_organization_id`.
   *
   * 2) Authorization:
   *    - Verify the authenticated member has project management capability within the selected organization scope.
   *    - Deny if unauthorized.
   *
   * 3) Request validation:
   *    - Read `employeeId` and `membershipRole` from request body.
   *    - Validate `membershipRole` is an allowed value per the domain’s project role vocabulary (service layer must enforce; do not rely solely on DB type since schema stores it as `String`).
   *
   * 4) Employee organization validation:
   *    - Verify the `employee_id` refers to a valid employee record and that the employee belongs to the selected organization scope.
   *    - The membership can only be created if employee belongs to the same organization as the project.
   *
   * 5) Duplication/conflict checks:
   *    - Because `erp_hrm_time_tracking_project_memberships` has a unique constraint on `(project_id, employee_id)`, check for an existing membership row for that pair with `deleted_at = null`.
   *    - If an active row exists, reject the request as a duplication conflict.
   *    - If only a deleted row exists, apply the business rule for re-assignment (reactivate vs reject) according to the project’s domain rules. If reactivation is supported, update the deleted row by setting `deleted_at` back to null and refreshing `updated_at`; otherwise reject.
   *
   * 6) Create membership record:
   *    - Insert into `erp_hrm_time_tracking_project_memberships`:
   *      - `project_id` = path `projectId`
   *      - `employee_id` = request `employeeId`
   *      - `membership_role` = request `membershipRole`
   *      - `created_at` / `updated_at` = now
   *      - `deleted_at` = null
   *
   * 7) Activity log:
   *    - Write an `erp_hrm_time_tracking_activity_log_entries` record (through the existing activity log service) capturing the performed user, organization scope, and target entity details for auditability.
   *
   * 8) Return response:
   *    - Return the created membership (including its ids and role) using the appropriate `I...` response type.
   *
   * Transactionality:
   * - Use a transaction so that the membership insert and activity log write succeed or fail together.
   *
   * Edge cases:
   * - Concurrent requests attempting the same `(project_id, employee_id)` should be handled via unique constraint errors mapped to a clean API error.
   * - Project soft-deletion / organization soft-deletion should prevent creation if the business requires active-only projects; enforce by checking `projects.deleted_at` and `organizations.deleted_at` if applicable through loaded entities.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingProjectMembership.ICreate,
  ): Promise<IErpHrmTimeTrackingProjectMembership> {
    try {
      return await postErpHrmTimeTrackingMemberProjectsProjectIdMemberships({
        member,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Manage project memberships for a single project within the selected organization context.
   *
   * This operation targets `erp_hrm_time_tracking_projects` by `projectId` and performs membership changes against `erp_hrm_time_tracking_project_memberships`, which links a project to an employee and stores the `membership_role` (used by the service layer to drive project-scoped permissions). The schema also includes `deleted_at`; when a membership is removed, the operation should mark `deleted_at` instead of removing the row to preserve historical assignment data.
   *
   * Security and authorization are enforced at two layers:
   * (1) the selected-organization isolation rule ensures the targeted project belongs to the currently selected organization, and (2) membership change permissions are enforced based on the caller’s project-scoped role capabilities. If the project is outside the selected organization, the operation must deny the request without changing any membership state.
   *
   * The request supports employees participating in multiple projects simultaneously because uniqueness is defined on `(project_id, employee_id)`, not on `employee_id` alone. Therefore, adding a membership for an employee to a different project must not conflict with existing memberships in other projects.
   *
   * When removal is requested, the operation must verify that the membership exists for the specified project and employee (and is currently active). If no membership exists, the operation must reject the removal and must not affect other memberships for that employee in other projects.
   *
   * Error handling expectations:
   * - If `projectId` does not belong to the selected organization, respond with an authorization/invalid-target style error and perform no membership changes.
   * - If attempting to add a membership that already exists as active, validate according to business rules (typically treat as no-op or reject based on request intent) without creating duplicates.
   * - If attempting to remove a non-existent membership for the project, reject and leave all memberships unchanged.
   *
   * Related operations:
   * - Use project membership listing/read endpoints to display current membership state to the UI before applying changes.
   * - Use project updates endpoints (where available) to modify project metadata; this endpoint is responsible specifically for membership assignment changes.
   *
   *
   *
   * @param connection
   * @param projectId Target project ID for which the membership assignments will be managed.
   * @param body Membership mutation request for a single project. Describes which employees to add/reactivate with which `membership_role`, and which employees to remove from this project. Removals must only apply to existing active memberships.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement PATCH /projects/{projectId}/memberships as an atomic membership mutation workflow.
   *
   * 1) Resolve and authorize target project
   * - Query `erp_hrm_time_tracking_projects` by `id = projectId` and verify it belongs to the selected organization (`erp_hrm_time_tracking_organization_id`).
   * - If not found or mismatched, return an error and do not proceed.
   *
   * 2) Parse mutation intent from request body
   * - The request body describes membership actions for employees under this project.
   * - Validate each referenced employee id exists in `erp_hrm_time_tracking_members` and is eligible within the selected organization context (service layer must enforce the employee belongs to the selected organization through domain rules).
   *
   * 3) Apply membership changes within a single transaction
   * - For each requested add/update action:
   *   a) Look up `erp_hrm_time_tracking_project_memberships` by (`project_id`, `employee_id`) including `deleted_at`.
   *   b) If no row exists: create a new membership row with `project_id`, `employee_id`, `membership_role`, and set `deleted_at = null`.
   *   c) If a row exists and `deleted_at` is null (already active):
   *      - If role differs, update `membership_role` and keep `deleted_at` null.
   *      - If role is the same, treat as no-op.
   *   d) If a row exists but `deleted_at` is not null (inactive): reactivate by setting `deleted_at = null` and set `membership_role`.
   *
   * - For each requested removal action:
   *   a) Look up the membership row by (`project_id`, `employee_id`) where `deleted_at` is null.
   *   b) If not found, reject the request (do not modify any rows), because removal requires an existing membership.
   *   c) If found, set `deleted_at` to current timestamp and update `updated_at`.
   *
   * 4) Enforce selected-organization isolation
   * - Ensure no membership change can target a project outside the selected organization (already enforced by step 1).
   * - Ensure employee references are valid for the selected organization.
   *
   * 5) Activity/audit integration (if applicable)
   * - If the service records activity log entries for membership changes, create `erp_hrm_time_tracking_activity_log_entries` records for the operation and include actor and target identifiers.
   *
   * 6) Response
   * - After successful transaction, return the updated membership projection for this project (summaries), consistent with the response DTO.
   *
   * Edge cases:
   * - Multiple requested actions for the same employee within the same request should be resolved deterministically (e.g., last action wins) after validation.
   * - When any action fails validation, the entire transaction must roll back to keep membership state consistent.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateMemberships(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingProjectMembership.IRequest,
  ): Promise<IErpHrmTimeTrackingProjectMembership.IUpdateResponse> {
    try {
      return await patchErpHrmTimeTrackingMemberProjectsProjectIdMemberships({
        member,
        projectId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the details of a specific project membership within the currently selected organization context.
   *
   * This endpoint is designed for viewing one membership record that links an employee to a project. The project scope is established by the {projectId} path parameter, and the membership record is identified by {membershipId}. The system must ensure the targeted project belongs to the selected organization context, enforcing organization isolation for all project operations.
   *
   * Business rules and isolation: the returned membership must correspond to the given project. If the authenticated user attempts to access a project outside the selected organization, the system must deny the operation. Additionally, for employee-perspective browsing behaviors, membership visibility must be restricted so that employees can view assigned projects only for their own memberships; therefore, when the caller is an employee, the operation must not reveal memberships that the caller does not have access to.
   *
   * Data model relationship: the membership entity is stored in erp_hrm_time_tracking_project_memberships, which includes project_id, employee_id, and membership_role, and supports historical retention via deleted_at. The API should only return an active membership record unless the business requirements explicitly allow viewing deactivated memberships; in all other cases, treat non-matching or unavailable records as not accessible.
   *
   * Error handling expectations: if the {projectId} does not match the membership’s project_id, the system must not return the membership. If the membership is unavailable due to access control or membership state constraints, the system must respond with an authorization/visibility error (or an equivalent “not found” behavior as defined by the global error policy).
   *
   * Related operations: this endpoint complements a project browsing flow where a caller first discovers projects they are assigned to via assigned-project list operations, then navigates to the specific membership details using membershipId. It also works alongside project/task operations that require membership-based permission checks, such as task management within a project based on membership_role.
   *
   * @param connection
   * @param projectId Target project ID whose organization scope is used to enforce tenant isolation.
   * @param membershipId Target membership ID of the employee-to-project assignment.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service-layer implementation steps:
   * 1) Parse path parameters: projectId (UUID) and membershipId (UUID).
   * 2) Enforce organization scoping:
   *    - Load the project by projectId and verify it belongs to the currently selected organization (erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id).
   *    - If not found or not in scope, deny.
   * 3) Load membership:
   *    - Query erp_hrm_time_tracking_project_memberships by id=membershipId.
   *    - Verify membership.project_id equals the given projectId (prevent cross-project access).
   *    - Apply active-state handling: if deleted_at is not null, treat as unavailable for normal viewing (deny or not found per error policy).
   * 4) Authorization based on caller:
   *    - Determine caller’s employee representation within this organization.
   *    - For employees, allow viewing only memberships tied to projects the employee is assigned to (conceptual rule: employees can view assigned projects only for their own memberships). Enforce that membership.employee_id matches caller’s employee id.
   *    - For higher-privileged actors (e.g., managers/owners) apply their role-permission capabilities to decide whether membership detail viewing is allowed; do not expand beyond authorization policy.
   * 5) Return response DTO mapped from membership entity fields:
   *    - Include membership_role and linked identifiers as defined by IErpHrmTimeTrackingProjectMembership.
   * 6) Error handling:
   *    - If project is out of scope: authorization error.
   *    - If membership.project_id mismatches or membership not accessible: not found / authorization error per global policy.
   *
   * Database query plan (typical):
   * - SELECT projects by id and organization id.
   * - SELECT membership by id, then validate project_id.
   * - Optional: when authorizing employees, also compare membership.employee_id with the authenticated employee id.
   *
   * No writes; no transactions needed beyond consistent reads.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":membershipId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("membershipId")
    membershipId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingProjectMembership> {
    try {
      return await getErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(
        {
          member,
          projectId,
          membershipId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an employee’s role within a specific project membership.
   *
   * This operation edits the existing record in `erp_hrm_time_tracking_project_memberships` that links an employee (`employee_id`) to a project (`project_id`) and stores the employee’s project responsibility via `membership_role`. Because `erp_hrm_time_tracking_project_memberships` is the basis for determining which employees can manage tasks and which projects an employee can view, changing the membership role immediately affects authorization decisions for task management within that project.
   *
   * Only authorized users who have project management capability in the currently selected organization context can perform this update. The service must enforce selected-organization isolation by ensuring that the targeted project belongs to the caller’s selected organization and that the membership row referenced by `membershipId` is part of that same project.
   *
   * Validation rules:
   *
   * - The `{projectId}` in the path must match `erp_hrm_time_tracking_project_memberships.project_id` for the row identified by `{membershipId}`.
   * - The membership row must be currently available for updates (i.e., it must not be marked as deleted via `deleted_at`).
   * - The update payload must validate `membership_role` against the system’s allowed project role values used elsewhere in the domain (e.g., member vs project-lead). If the new role is invalid, the request is rejected with an error.
   *
   * The operation performs the database update as a single transaction:
   *
   * - Load the target membership row by id.
   * - Confirm it belongs to the given project id.
   * - Apply the new `membership_role` (and any other updatable fields defined in the ProjectMembership update DTO).
   * - Persist and return the updated membership.
   *
   * Related behaviors:
   *
   * - If a caller needs to see which projects the employee is assigned to (based on current memberships), they should use the project membership list operation from the employee perspective (assigned projects list). That list is driven by active membership entries.
   * - If a caller needs to assign an employee to a project (create membership) or remove them from a project (erase membership), use the dedicated ProjectMembership assignment/removal operations; this endpoint only updates an existing membership.
   *
   * Errors:
   *
   * - If the membership does not exist or does not belong to the requested project, the operation must reject the request.
   * - If the caller lacks project management capability in the selected organization context, access must be denied.
   *
   * Timestamps:
   *
   * - The `updated_at` column is refreshed as part of the update.
   *
   *
   *
   * @param connection
   * @param projectId Target project ID that scopes the membership update.
   * @param membershipId Target membership record ID to update within the specified project.
   * @param body Update payload for an existing project membership, primarily used to change the membership role (e.g., member vs project-lead) inside the target project.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service layer steps:
   *
   * 1. Parse `projectId` and `membershipId` from path.
   * 2. Start a DB transaction.
   * 3. Fetch the target membership row from `erp_hrm_time_tracking_project_memberships` by `id = membershipId`, selecting `id`, `project_id`, `employee_id`, `membership_role`, `deleted_at`, `created_at`, `updated_at`.
   * 4. If no row is found, return a not-found error.
   * 5. Verify `project_id` equals the provided `projectId`; if not, return an invalid-scope error (do not reveal existence across scopes).
   * 6. Fetch the project row from `erp_hrm_time_tracking_projects` by `id = projectId` and verify it is not deleted (`deleted_at` is null). Also verify the project’s `erp_hrm_time_tracking_organization_id` matches the caller’s selected organization context (authorization enforcement).
   * 7. Validate request body fields:
   *    - Validate `membership_role` value is allowed by domain rules (e.g., member vs project-lead).
   *    - Ensure any other updatable properties (if present in the .IUpdate DTO) comply with constraints.
   * 8. Apply update:
   *    - Update `membership_role` to the requested value.
   *    - Set `updated_at` to current time.
   * 9. Persist update to `erp_hrm_time_tracking_project_memberships`.
   * 10. Commit transaction.
   * 11. Return the updated membership entity as the response DTO.
   *
   * Edge cases:
   *
   * - If the membership row has `deleted_at` not null, reject as not updatable.
   * - If membership belongs to the project but project belongs to a different organization than the selected organization, reject with access denied.
   * - Prevent changing `project_id` or `employee_id` unless the ProjectMembership update DTO explicitly allows it; by default, keep them immutable and only update role.
   *
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":membershipId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("membershipId")
    membershipId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingProjectMembership.IUpdate,
  ): Promise<IErpHrmTimeTrackingProjectMembership> {
    try {
      return await putErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(
        {
          member,
          projectId,
          membershipId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes the specified project membership record from the target project.
   *
   * This endpoint targets the ERP HRM time tracking domain concept represented by `erp_hrm_time_tracking_project_memberships`, which links an employee (`employee_id`) to a project (`project_id`) with a `membership_role` and timestamps (`created_at`, `updated_at`). Removing a membership ends the employee’s current eligibility for project-scoped operations and views.
   *
   * Security and authorization are enforced using the project’s organization scope via `erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id`, and by checking that the caller has project management capability within the currently selected organization context. The operation must validate that the membership identified by `{membershipId}` belongs to the `{projectId}` being modified; requests that reference a membership outside the given project must be rejected.
   *
   * Business rules: the system must allow removing only existing memberships for the specified project. If the membership does not exist or is already removed (`deleted_at` is not null), the system rejects the request to avoid inconsistent “no-op” states. When removal succeeds, future access to project member–restricted functionality is revoked for that employee for the given project, while historical records associated with prior timelogs for that project remain available for historical reporting and auditability (membership removal must not erase previously recorded historical timelogs).
   *
   * Related behavior: after this operation, any UI or subsequent API calls that determine assigned projects for an employee must reflect the updated membership set, and project-member visibility that depends on current membership must exclude this removed employee for the target project.
   *
   * Error handling: return authorization errors when the project is outside the selected organization context or the caller lacks project management capability. Return not-found/conflict-style errors when the membership does not exist for the provided `{projectId}`, or when attempting to remove an already-removed membership.
   *
   * @param connection
   * @param projectId Target project identifier to which the membership must belong.
   * @param membershipId Identifier of the specific project membership record to remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Parse `projectId` (UUID) and `membershipId` (UUID) from path.
   * 2) Load the target membership row from `erp_hrm_time_tracking_project_memberships` by `id = membershipId`.
   *    - Ensure it is active: `deleted_at IS NULL`.
   *    - Validate `membership.project_id == projectId`; if not, reject.
   * 3) Load the target project from `erp_hrm_time_tracking_projects` by `id = projectId`.
   *    - Ensure the project is active: `deleted_at IS NULL`.
   * 4) Authorization:
   *    - Confirm the caller has project management capability for the project’s organization using `erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id` and the currently selected organization context.
   *    - Deny if the caller is not authorized or the organization context does not match.
   * 5) Removal:
   *    - Update the membership row to mark it removed by setting `deleted_at = now()` and updating `updated_at` accordingly.
   *    - Do this in a transaction to ensure membership and project existence checks are consistent.
   * 6) Activity logging:
   *    - Insert an `erp_hrm_time_tracking_activity_log_entries` record capturing the membership removal action, including performedBy user and target identifiers, as required by the domain’s activity log behavior.
   * 7) Return:
   *    - For success, return HTTP 200/204 with no response body (responseBody is null).
   * Edge cases:
   * - If membership does not exist or is already removed: reject with an error indicating the membership is not currently active.
   * - If project is deleted (`deleted_at` not null): reject.
   * - If membership belongs to a different project than `{projectId}`: reject.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":membershipId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedParam("membershipId")
    membershipId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingMemberProjectsProjectIdMembershipsMembershipId(
        {
          member,
          projectId,
          membershipId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
