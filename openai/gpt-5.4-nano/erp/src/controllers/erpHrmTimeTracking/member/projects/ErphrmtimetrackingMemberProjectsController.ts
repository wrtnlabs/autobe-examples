import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingProject } from "../../../../api/structures/IErpHrmTimeTrackingProject";
import { IPageIErpHrmTimeTrackingProject } from "../../../../api/structures/IPageIErpHrmTimeTrackingProject";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmTimeTrackingMemberProjectsProjectId } from "../../../../providers/deleteErpHrmTimeTrackingMemberProjectsProjectId";
import { getErpHrmTimeTrackingMemberProjectsProjectId } from "../../../../providers/getErpHrmTimeTrackingMemberProjectsProjectId";
import { patchErpHrmTimeTrackingMemberProjects } from "../../../../providers/patchErpHrmTimeTrackingMemberProjects";
import { postErpHrmTimeTrackingMemberProjects } from "../../../../providers/postErpHrmTimeTrackingMemberProjects";
import { putErpHrmTimeTrackingMemberProjectsProjectId } from "../../../../providers/putErpHrmTimeTrackingMemberProjectsProjectId";

@Controller("/erpHrmTimeTracking/member/projects")
export class ErphrmtimetrackingMemberProjectsController {
  /**
   * Create a new Project within the currently selected organization context.
   *
   * This endpoint lets an authorized user set up a new project workspace that acts as the container for tasks and employee time tracking. The created record is stored in `erp_hrm_time_tracking_projects`, which defines the project’s organization scope via `erp_hrm_time_tracking_organization_id`, its UI identification via `name` and `color`, and its lifecycle behavior via `status`.
   *
   * Only users who have project management capability in the selected organization may call this operation. Users without management capability may still have project viewing capability, but they are not allowed to perform project creation. The system enforces organization-scoped access: the created project will always belong to the organization selected in the user’s current context, and the organization association must not be overridden by request data.
   *
   * Validation and constraints are applied according to the database model: project `name` must be unique within the organization (unique constraint on `[erp_hrm_time_tracking_organization_id, name]`). The operation sets `created_at` and `updated_at` automatically by the service/database layer and persists the provided fields into `erp_hrm_time_tracking_projects`. The table also supports `deleted_at`; creation results in a project that is not deleted (i.e., `deleted_at` remains null).
   *
   * To complete common workflows, this endpoint is typically used together with project listing and project detail endpoints (not defined here) so users can immediately find and manage the newly created project. If the request attempts to use a `name` that already exists in the selected organization, the operation must fail with an error indicating the conflict.
   *
   * Expected error behavior includes: access denied when the caller lacks project management capability in the selected organization, and validation/conflict errors when uniqueness constraints are violated or provided fields are invalid.
   *
   * @param connection
   * @param body Project creation payload. Organization scope is derived from the caller’s selected organization context; the client must not provide `erp_hrm_time_tracking_organization_id`.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Service-layer algorithm:
   * 1) Resolve selected organization context from the authenticated member/session (do not accept organization id from request payload).
   * 2) Authorize: verify the caller has project management capability within that selected organization.
   * 3) Validate request payload fields for semantic constraints (non-empty name, valid status value semantics as defined by the system; validate color format as expected by UI conventions).
   * 4) Enforce uniqueness: query `erp_hrm_time_tracking_projects` for an existing row where `erp_hrm_time_tracking_organization_id` = selectedOrganizationId AND `name` = request.name AND `deleted_at` is null (or otherwise matches the system’s availability rule for deleted projects).
   *    - If found, return a conflict error.
   * 5) Insert into `erp_hrm_time_tracking_projects` with:
   *    - `erp_hrm_time_tracking_organization_id` = selectedOrganizationId
   *    - `name` = request.name
   *    - `color` = request.color
   *    - `status` = request.status
   * 6) Return the inserted project record as `IerpHrmTimeTrackingProject` (include `id`, `name`, `color`, `status`, and timestamps if the DTO exposes them).
   *
   * Database operations:
   * - Use a single transaction for the uniqueness check + insert (or rely on a DB unique constraint and translate its violation to an application-level conflict error).
   *
   * Edge cases:
   * - If project management capability is missing, deny before touching the database.
   * - If uniqueness fails due to concurrent creation requests, translate DB unique constraint error into a deterministic conflict response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingProject.ICreate,
  ): Promise<IErpHrmTimeTrackingProject> {
    try {
      return await postErpHrmTimeTrackingMemberProjects({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of projects visible in the currently selected organization context.
   *
   * This operation is intended for project browsing screens where members need to efficiently find projects and optionally narrow the list by the project lifecycle status. The project lifecycle status is stored on `erp_hrm_time_tracking_projects.status` and is constrained to the allowed values `active`, `archived`, and `completed`. When the client supplies a status filter, the operation must return only projects matching that status within the selected organization. If the filter produces no matches, the operation returns an empty page result rather than falling back to an unfiltered list.
   *
   * All results must be scoped to the member’s currently selected organization context. The system must deny attempts to access projects outside the selected organization. Additionally, projects that have been removed must not appear in browsing results; if a project record is unavailable due to deletion, it must be treated as not found for the purposes of list browsing.
   *
   * The returned items are optimized for list display (summaries), not for editing; full editing details are provided by separate project detail/update operations.
   *
   * Pagination and sorting inputs are applied at the database layer to support efficient navigation through large result sets. The endpoint validates the requested status value against the allowed lifecycle values and applies the corresponding query constraints.
   *
   * @param connection
   * @param body Search criteria for project browsing in the selected organization, including optional status filter and pagination/sorting parameters.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1) Read authenticated member’s selected organization context.
   * 2) Validate request criteria:
   *    - Validate optional `status` filter value is one of: active | archived | completed.
   * 3) Query `erp_hrm_time_tracking_projects` with required scoping:
   *    - WHERE erp_hrm_time_tracking_organization_id = selectedOrganizationId
   * 4) Apply filtering:
   *    - If status provided: AND status = requestedStatus
   * 5) Exclude deleted/unavailable projects:
   *    - AND deleted_at IS NULL
   * 6) Apply sorting and pagination based on request fields.
   * 7) Select only summary columns needed for list UI (e.g., id, name, color, status, created_at/updated_at if present in the summary DTO contract).
   * 8) Return a paginated response matching `IPageIErpHrmTimeTrackingProject.ISummary`, including pagination metadata.
   *
   * Authorization/consistency:
   * - If the authenticated member tries to access projects outside the selected organization, the query will naturally return none; for stronger guarantees, also enforce organization-context access checks at the service layer.
   *
   * Edge cases:
   * - No matches => return empty `data` with pagination metadata.
   * - Invalid status => return validation error.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingProject.IRequest,
  ): Promise<IPageIErpHrmTimeTrackingProject.ISummary> {
    try {
      return await patchErpHrmTimeTrackingMemberProjects({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve details for a single time-tracking project identified by its unique project ID.
   *
   * This endpoint is intended for project detail views in the UI: it loads the project’s display fields used to identify and manage the workspace, including the project’s `name`, `color`, and lifecycle `status`. It also returns audit timestamps (`created_at`, `updated_at`) associated with the stored record in `erp_hrm_time_tracking_projects`.
   *
   * Access control is enforced using the currently selected organization context. The system must ensure the targeted project belongs to the selected organization via `erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id`. If the project is not in the selected organization, the request must be denied.
   *
   * In addition, project viewing capability must be checked before returning data. Users without project viewing permission must not be able to access either the project list or project details in the selected organization.
   *
   * Validation and error behavior: the `projectId` path parameter must be a valid UUID. If no matching project is found (or it exists but is outside the selected organization), the system returns an appropriate not-found/denied error response consistent with the service’s error handling.
   *
   * Related operations: this endpoint complements project list retrieval operations (used to browse projects with search/filter/pagination) and should be used after a user selects a project from that list. Project management operations (create/update/archive/complete/delete) are separate and require additional project management capability.
   *
   * @param connection
   * @param projectId Target project UUID to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   * 1) Extract `projectId` from path parameters.
   * 2) Load the selected organization context from the authenticated actor/session.
   * 3) Query `erp_hrm_time_tracking_projects` by `id = projectId` AND `erp_hrm_time_tracking_organization_id = selectedOrganizationId`.
   *    - Select columns needed by `IErpHrmTimeTrackingProject` mapping: id, erp_hrm_time_tracking_organization_id, name, color, status, created_at, updated_at, deleted_at.
   * 4) If no row matches, return not-found/denied according to standard error mapping.
   * 5) Authorization check: confirm the actor has project viewing capability within the selected organization context (project view access vs project manage access). If not allowed, deny.
   * 6) Return the mapped DTO response.
   *
   * Edge cases:
   * - If `deleted_at` is non-null, include it according to DTO design; do not attempt recovery in this read endpoint.
   * - Ensure no data leakage across organizations by always scoping the query with `erp_hrm_time_tracking_organization_id`.
   *
   * Performance:
   * - Use the primary key lookup on `id` and the organization scope to keep the query efficient.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":projectId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingProject> {
    try {
      return await getErpHrmTimeTrackingMemberProjectsProjectId({
        member,
        projectId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing organization-scoped project.
   *
   * This operation updates the core project identification attributes used for project selection and filtering—specifically the project’s display `name` and UI `color` value. It also allows updating the project’s `status`, which is the lifecycle status used by the system to control behavior such as which projects can be used for recording timelog and which projects appear in filtering views.
   *
   * Access to this endpoint is restricted to authenticated members who have project management capability within the selected organization context. The system must deny the operation if the targeted project does not belong to the currently selected organization.
   *
   * The operation targets the `erp_hrm_time_tracking_projects` record by `id` and updates only the fields provided in the request body. The update must preserve organization scoping by selecting the project with both `id` and `erp_hrm_time_tracking_organization_id` equal to the selected organization context.
   *
   * Validation rules: the system requires that `name` and `color` must be consistently present for the project to remain usable in project lists. If `name` or `color` are missing when the project is updated, the system must reject the request. The lifecycle `status` should be validated against the service’s allowed lifecycle states as enforced by the domain business rules.
   *
   * On success, the operation returns the updated project record including its identification and lifecycle fields.
   *
   * Related operations:
   * - Project viewing requires project viewing capability; list/detail retrieval should be performed using the project view endpoints rather than relying on this update operation.
   * - Project assignment to employees is handled via ProjectMembership operations; updating a project does not change membership relationships.
   *
   * @param connection
   * @param projectId Target project identifier to update within the currently selected organization context.
   * @param body Project update payload containing the fields to change for the targeted project. Name and color must be present to keep the project usable in project lists.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization & context
   * - Require an authenticated member.
   * - Verify the caller has project management capability in the currently selected organization context.
   * - Enforce organization scoping: the project targeted by `projectId` must belong to the selected organization.
   *
   * 2) Input handling
   * - Read request body of type IErpHrmTimeTrackingProject.IUpdate.
   * - Validate required identification fields for update consistency:
   *   - If `name` is absent/empty in the incoming update payload, reject.
   *   - If `color` is absent/empty in the incoming update payload, reject.
   * - Validate `status` if provided using the domain allowed lifecycle values.
   *
   * 3) Database transaction
   * - Start a transaction.
   * - Load the target project row with where:
   *   - id = {projectId}
   *   - erp_hrm_time_tracking_organization_id = selectedOrganizationId
   *   - (optionally) deleted_at is null to exclude removed rows if the service treats deleted rows as not updatable.
   * - If no row is found, reject with a not-found/forbidden error per error scenario conventions.
   * - Apply updates to the loaded project entity using the provided fields.
   * - Persist changes.
   * - Commit transaction.
   *
   * 4) Audit/activity logging (if applicable)
   * - If the service records activity log entries for update actions, create an ActivityLogEntry within the same transaction or via a reliable async mechanism, referencing the affected project.
   *
   * 5) Response
   * - Return the updated project record mapped to IErpHrmTimeTrackingProject (detailed DTO).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":projectId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmTimeTrackingProject.IUpdate,
  ): Promise<IErpHrmTimeTrackingProject> {
    try {
      return await putErpHrmTimeTrackingMemberProjectsProjectId({
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
   * Permanently removes a project record from the selected organization.
   *
   * This endpoint is intended for users who have project management capability in the currently selected organization context (project:manage). Project viewing capability alone is not sufficient to perform deletion.
   *
   * The target record is `erp_hrm_time_tracking_projects`. The operation uses the provided `{projectId}` to identify the project, and the system enforces that the project belongs to the currently selected organization (`erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id`). If the project does not belong to the selected organization, the request must be denied.
   *
   * Deletion is allowed only when the project has no associated timelogs (`erp_hrm_time_tracking_timelogs.erp_hrm_time_tracking_project_id`). If any timelog exists for the project, the operation must fail and the project must remain available.
   *
   * If the project is not available for deletion, the client should receive an indication that the project cannot be found or is no longer eligible for deletion.
   *
   * On success, the project is removed from project lists for that selected organization. Because deletion is blocked when timelogs exist, successful deletion implies there are no timelog records associated with the project at the time of the request.
   *
   * @param connection
   * @param projectId Target project's identifier to permanently remove within the currently selected organization context.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization & organization scoping
   * - Resolve the caller's selected organization context.
   * - Verify caller has project management capability (project:manage) for the selected organization.
   *
   * 2) Load and validate target project
   * - Query erp_hrm_time_tracking_projects by id = {projectId} AND erp_hrm_time_tracking_organization_id = currentOrganizationId.
   * - If not found, treat as unavailable (either does not exist or not in org).
   * - If the project has deleted_at not null (already deleted), fail as unavailable.
   *
   * 3) Enforce deletion policy based on timelogs
   * - Check existence of timelogs: SELECT 1 FROM erp_hrm_time_tracking_timelogs WHERE erp_hrm_time_tracking_project_id = project.id AND deleted_at IS NULL (treating presence of any timelog records as blocking deletion per business rule).
   * - If any timelog exists, fail with a business error indicating deletion is not allowed.
   *
   * 4) Perform deletion
   * - Permanently remove the project record.
   * - Ensure referential integrity: because deletion is allowed only when there are no timelogs, related timelog rows should not exist; still rely on transaction constraints.
   *
   * 5) Activity logging (if implemented by service layer)
   * - Optionally create an ActivityLogEntry recording the deletion action with performedBy set to the caller's user and target set to the project id, following audit patterns.
   *
   * 6) Return
   * - Return HTTP 200/204 with no response body (responseBody null).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":projectId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("projectId")
    projectId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmTimeTrackingMemberProjectsProjectId({
        member,
        projectId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
