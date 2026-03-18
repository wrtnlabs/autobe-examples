import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimesheet } from "../../../../api/structures/IHrmTimeTrackingTimesheet";
import { IPageIHrmTimeTrackingTimesheet } from "../../../../api/structures/IPageIHrmTimeTrackingTimesheet";
import { EmployeeAuth } from "../../../../decorators/EmployeeAuth";
import { EmployeePayload } from "../../../../decorators/payload/EmployeePayload";
import { deleteHrmTimeTrackingEmployeeTimesheetsTimesheetId } from "../../../../providers/deleteHrmTimeTrackingEmployeeTimesheetsTimesheetId";
import { getHrmTimeTrackingEmployeeTimesheetsTimesheetId } from "../../../../providers/getHrmTimeTrackingEmployeeTimesheetsTimesheetId";
import { patchHrmTimeTrackingEmployeeTimesheets } from "../../../../providers/patchHrmTimeTrackingEmployeeTimesheets";
import { postHrmTimeTrackingEmployeeTimesheets } from "../../../../providers/postHrmTimeTrackingEmployeeTimesheets";
import { postHrmTimeTrackingEmployeeTimesheetsTimesheetIdResubmit } from "../../../../providers/postHrmTimeTrackingEmployeeTimesheetsTimesheetIdResubmit";
import { postHrmTimeTrackingEmployeeTimesheetsTimesheetIdSubmit } from "../../../../providers/postHrmTimeTrackingEmployeeTimesheetsTimesheetIdSubmit";
import { putHrmTimeTrackingEmployeeTimesheetsTimesheetId } from "../../../../providers/putHrmTimeTrackingEmployeeTimesheetsTimesheetId";

@Controller("/hrmTimeTracking/employee/timesheets")
export class HrmtimetrackingEmployeeTimesheetsController {
  /**
   * Create a new draft weekly timesheet for the authenticated employee in the currently selected organization.
   *
   * This operation creates a timesheet record from the weekly reporting model defined by the underlying `hrm_time_tracking_timesheets` table, which stores one organization-scoped and employee-owned timesheet for a Monday-to-Sunday period. The caller provides the target week information, and the service derives the `week_start_date` and `week_end_date` boundaries for that reporting week. The created record begins in draft status, reflecting the workflow described by the business requirements in which employees first prepare a weekly draft before later submitting it for approval.
   *
   * The operation is tightly coupled to the normalized timesheet composition structure in the database. The `hrm_time_tracking_timesheets` table stores the workflow state and ownership metadata, while the included work entries are attached through `hrm_time_tracking_timesheet_timelogs`. After creating the parent draft timesheet, the service must discover the employee's `hrm_time_tracking_timelogs` within the same organization and within the requested weekly boundary, then create inclusion rows for eligible timelog records. Because the timelog table preserves historical work entries and the inclusion table enforces that each timelog can belong to at most one timesheet at a time, this operation must attach only timelogs that are not already linked to another active timesheet composition.
   *
   * Security and access control are organization-scoped. The current organization context must be honored throughout the request, and the operation must create a timesheet only for the authenticated employee identity within that same organization context. It must not allow one organization's role or context to create or expose timesheet data in another organization. This behavior aligns with the requirement that access evaluation is performed separately for each organization and that business actions remain bound to the currently selected organization.
   *
   * Business validation must enforce the weekly lifecycle expectations described in the requirements. The service should create a draft only for a valid weekly period and should avoid duplicate weekly records for the same employee, consistent with the schema-level uniqueness on employee and `week_start_date`. It should also preserve the distinction between creation and later review stages by leaving `submitted_at`, `reviewed_at`, and `rejection_reason` unset at creation time. Related operations used with this endpoint are the later submission operation that changes a draft to submitted status and the review operations that approve or reject submitted timesheets. Clients typically call this creation endpoint before any submission or reviewer workflow begins.
   *
   * Expected error handling includes rejecting requests when the organization context is invalid for the authenticated user, when the target week would duplicate an existing timesheet for the same employee and week, or when the input does not resolve to a proper Monday-to-Sunday reporting window. If any failure occurs while creating the parent timesheet or inclusion rows, the service should avoid partial persistence and return a clear failure outcome so the client is not misled about whether the weekly draft was created.
   *
   * @param connection
   * @param body Target week information for creating a draft timesheet
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement a transactional create-timesheet service for the authenticated employee in the currently selected organization.
   *
   * 1. Resolve the authenticated employee account and current organization context from the session. Verify the employee has access in the selected organization context before performing any write.
   * 2. Parse the request body as `IHrmTimeTrackingTimesheet.ICreate`. Use the supplied target week information to derive the exact Monday `week_start_date` and Sunday `week_end_date` for the reporting period in the organization's operational context. Reject invalid week inputs that cannot map to a single Monday-to-Sunday range.
   * 3. Check for an existing non-deleted timesheet for the same `hrm_time_tracking_employee_id` and derived `week_start_date`. The schema has a uniqueness rule on `[hrm_time_tracking_employee_id, week_start_date]`, so pre-check and also handle unique-constraint failure defensively.
   * 4. Insert a new `hrm_time_tracking_timesheets` row with the resolved `hrm_time_tracking_organization_id`, authenticated `hrm_time_tracking_employee_id`, derived `week_start_date`, derived `week_end_date`, and `status` set to `draft`. Set `submitted_at`, `reviewed_at`, and `rejection_reason` to null at creation time. Populate `created_at` and `updated_at` with the current timestamp.
   * 5. Query `hrm_time_tracking_timelogs` for the same organization and employee where `worked_on` falls within the derived weekly range and `deleted_at` is null. Exclude timelogs already linked through `hrm_time_tracking_timesheet_timelogs` records that remain active, because each timelog can belong to at most one timesheet at a time.
   * 6. For each eligible timelog, insert a `hrm_time_tracking_timesheet_timelogs` row referencing the new timesheet and the timelog. Set inclusion `created_at` and `updated_at` timestamps. Perform all inserts in the same transaction as the parent timesheet creation.
   * 7. Return the created timesheet resource. The response representation should expose the persisted draft workflow fields and may include relationships according to the generated DTO definition.
   * 8. Error handling: return not-found or forbidden style failures when the authenticated employee cannot act in the current organization; return conflict when a weekly timesheet already exists for the employee and week; return validation failure for malformed or out-of-scope week input; and roll back the full transaction on any inclusion insert failure so no partial draft is left behind.
   * 9. Timeout safety: if any dependent processing times out before business completion is known, do not report success. Preserve organization context and avoid duplicate timesheet creation from retried user actions by relying on the unique employee-week constraint and transactional boundaries.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.ICreate,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingEmployeeTimesheets({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of weekly timesheets in the current organization context.
   *
   * This operation provides the primary browsing entry point for timesheet visibility described in the requirements. It supports employee self-view of owned weekly timesheets and organization-scoped approval worklists for users who can approve timesheets. In accordance with the timesheet workflow, each result represents a Monday-to-Sunday reporting period stored in the weekly timesheet record, including its workflow status, submission timestamp, review timestamp, and any rejection reason when the record has been returned to draft after review.
   *
   * The operation is explicitly scoped to the currently selected organization, reflecting the multi-tenant organization boundary defined by the platform. The underlying hrm_time_tracking_timesheets table belongs to one hrm_time_tracking_organizations record and one hrm_time_tracking_employees record, and the list must not cross organization boundaries. Role evaluation must also remain organization-specific. An employee may view only timesheets they own, while owner or manager users may view submitted timesheets requiring approval only when their permissions in the current organization allow approval-related access.
   *
   * Filtering behavior follows the documented list-browsing requirements. Clients may request paginated results filtered by workflow status and by a date range aligned to the weekly reporting period. The response should be optimized for list and queue screens, so it should return timesheet summary data rather than a full expanded workflow history. When used as an approval worklist, the list should prominently expose submitted records in the current organization. When used as an employee history view, the list should present only the requesting employee's own records.
   *
   * This operation is commonly used before a detail retrieval or a workflow action on an individual timesheet. A client typically executes this list operation first to find the relevant weekly record and then navigates to a detail-oriented endpoint or a dedicated approval or rejection endpoint for a single timesheet. Error handling must deny access when the caller attempts to use permissions from another organization context, and the operation must preserve the active organization context even if downstream processing fails or times out.
   *
   * @param connection
   * @param body Timesheet list filters and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement a paginated search query over hrm_time_tracking_timesheets constrained to the authenticated user's current organization context.
   *
   * Resolve the caller's active organization context from authentication/session state before executing the query. Reject the request if the caller has no valid organization context or lacks permission in that organization. For employee actors, add a mandatory predicate hrm_time_tracking_employee_id = caller employee account id so that only self-owned timesheets are visible. For owner and manager actors with timesheet approval capability in the current organization, allow organization-scoped querying; when the request is intended as an approval worklist, default or apply filters that emphasize submitted records, but never bypass the organization boundary.
   *
   * Build the base query against hrm_time_tracking_timesheets with deleted_at IS NULL and hrm_time_tracking_organization_id = current organization id. Apply optional filters from IHrmTimeTrackingTimesheet.IRequest for status and for a requested date range against week_start_date and or week_end_date according to the DTO definition. Use the available indexes on (organization, status, week_start_date) and (employee, status, week_start_date) to keep filtering efficient. Order results deterministically, preferably by week_start_date descending and then id for tie-breaking, to guarantee stable pagination.
   *
   * Return a paginated IPageIHrmTimeTrackingTimesheet.ISummary response. Each summary should expose fields appropriate for list screens, including ownership context, reporting week boundaries, workflow status, submitted_at, reviewed_at, and rejection_reason when present in the underlying record. Do not calculate or persist total hours from the timesheet table itself unless the summary DTO explicitly requires it and the implementation derives it from linked hrm_time_tracking_timesheet_timelogs and timelog data. If such derived aggregation is needed, compute it read-only without mutating stored data.
   *
   * Enforce security and edge cases carefully. Deny any attempt to retrieve records from another organization, even if the user has permissions elsewhere. Prevent deactivated employee status in another context from affecting visibility rules outside the active organization. If the request contains invalid filter combinations, return a validation error. If a timeout or unexpected dependency failure occurs during query processing, return a clear failure response without implying that organization context or data scope changed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IRequest,
  ): Promise<IPageIHrmTimeTrackingTimesheet.ISummary> {
    try {
      return await patchHrmTimeTrackingEmployeeTimesheets({
        employee,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed weekly timesheet record identified by the given timesheet ID.
   *
   * This operation returns a single timesheet that belongs to the currently selected organization context. In the business domain, a timesheet is the employee-owned weekly aggregation of recorded work from Monday to Sunday rather than an independent source of work data. The returned detail is intended to support both employee self-view and reviewer inspection by exposing the weekly record together with the included time entries and the overall state of the submission.
   *
   * Access to this operation is organization-scoped. An employee may use it to read a timesheet they own, while an owner or manager may use it to inspect a submitted timesheet when they hold the permission required to review or approve timesheets in the current organization. Permissions must be evaluated only from the caller's role assignment in the active organization, and access must be denied when the referenced timesheet belongs to another organization or when the caller lacks the required authority in the current organization.
   *
   * The operation is backed primarily by the timesheet aggregate and its related timelog inclusion records. The response should expose the employee associated with the timesheet, the reporting week, the timesheet status, the included timelogs, and any review metadata such as reviewer and review time when the timesheet has already been approved. This aligns with the review workflow requirement that a submitted timesheet be presented with the employee, week, included timelogs, and calculated total hours.
   *
   * This endpoint is commonly used after a caller has discovered the target record from the timesheet list operation. A paginated worklist or personal list can be obtained first, and then this detail endpoint can be called with the selected timesheet ID to inspect the full weekly record. For approval scenarios, this read operation should precede any dedicated approval action so that the approver can validate the submission contents before changing its state.
   *
   * If the timesheet does not exist, is outside the selected organization, or is not visible to the caller under ownership and approval-view rules, the request must fail without exposing cross-organization information. The operation is read-only and must not alter timesheet status, timelog lock state, reviewer assignment, or any historical records.
   *
   * @param connection
   * @param timesheetId Target timesheet identifier in the current organization context
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load the target record from hrm_time_tracking_timesheets by its primary identifier and constrain the lookup to the caller's current organization context.
   *
   * Authorize access using organization-scoped role evaluation. Allow the request when the caller is the employee owner of the timesheet in the current organization, or when the caller is an owner or manager with permission to review or approve timesheets in that same organization. Reject access if the timesheet belongs to another organization or if the caller lacks the relevant permission in the active organization.
   *
   * Query and assemble the detailed timesheet aggregate. Include the employee relationship for ownership display, resolve related inclusion rows from hrm_time_tracking_timesheet_timelogs, and load the referenced timelog records needed to present the submitted work entries. Compute or expose the total logged hours for the week from the included timelogs so the response supports approval review requirements.
   *
   * Return the current timesheet status and review metadata. If the status is approved, include the reviewing user reference and recorded review timestamp when present. Preserve read-only behavior: do not change status, do not modify timelog membership, and do not alter any lock state. When the record is missing or inaccessible, raise a not-found or forbidden error according to the authorization outcome without leaking data across organizations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":timesheetId")
  public async at(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await getHrmTimeTrackingEmployeeTimesheetsTimesheetId({
        employee,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a single weekly timesheet within the current organization context.
   *
   * This operation modifies an existing record from the `hrm_time_tracking_timesheets` table, which represents a Monday-to-Sunday reporting period owned by one employee and scoped to one organization. The underlying schema stores the workflow fields `status`, `submitted_at`, `reviewed_at`, and `rejection_reason`, while the included work entries are normalized through `hrm_time_tracking_timesheet_timelogs` rather than embedded directly on the timesheet. As documented by the schema comments, calculated totals are not persisted on the base timesheet table and must be derived from linked timelog records.
   *
   * Authorization for this operation must be evaluated strictly in the currently selected organization. The loaded requirements state that role-based access is organization-scoped, and permissions from another organization must not grant access here. The timesheet owner may update their own editable timesheet data only when the workflow state permits it. Users who can approve timesheets in the same organization, typically owner or manager actors with the necessary permission, may perform review-oriented updates for submitted timesheets. Access must be denied when the caller lacks the required permission in the active organization context even if they hold broader rights elsewhere.
   *
   * Business behavior must follow the loaded timesheet workflow requirements. When a draft timesheet is submitted, the system changes its status to `submitted`, makes the awaiting-review state visible to the owner, and places it into the submitted review queue for approvers in the same organization. When a submitted timesheet is approved, the system changes the status to `approved`, records the review time, and locks all included timelogs from further editing and deletion. If the implementation supports rejection through this update route, rejection must use the schema-backed `rejection_reason` field and record `reviewed_at` consistently with the review outcome.
   *
   * This operation is related to list and detail viewing flows for timesheets. `PATCH /timesheets` should typically be used first to browse paginated timesheet lists filtered by status and date range, especially for approval worklists. After the client identifies a target record from that list, `PUT /timesheets/{timesheetId}` applies an allowed modification to that single timesheet. Clients should not use this operation to edit timelog composition directly unless the underlying update DTO and implementation explicitly coordinate with `hrm_time_tracking_timesheet_timelogs` under draft-only rules.
   *
   * Validation and error handling must protect workflow integrity and historical records. The system must reject updates for a timesheet outside the current organization scope, reject changes that violate the allowed workflow transition rules, and reject employee-driven submission attempts when the employee is deactivated because deactivated employees are not eligible for time logging or timesheet submission. Timeout or uncertain downstream conditions must not leave the caller believing the update succeeded when the business outcome cannot be confirmed.
   *
   * @param connection
   * @param timesheetId Target timesheet identifier
   * @param body Updatable timesheet fields and workflow change data
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load the target `hrm_time_tracking_timesheets` row by `id = timesheetId` and ensure `deleted_at IS NULL`. Resolve the caller's active organization context and verify that the timesheet's `hrm_time_tracking_organization_id` matches that context before any modification. Reject the request if the timesheet is not found in the active organization scope.
   *
   * Authorize according to organization-scoped access rules. Permit employee self-service updates only for the employee who owns the timesheet (`hrm_time_tracking_employee_id`) and only for workflow transitions that employees are allowed to perform, such as updating a draft toward submission if supported by the DTO. Permit review-oriented updates only for users with timesheet approval permission in the current organization. Do not grant access based on roles from another organization.
   *
   * Apply only fields that exist in the update DTO and are backed by the loaded schema. Treat workflow timestamps as server-managed values: if the requested status transition moves a draft timesheet to `submitted`, set `submitted_at` to the current timestamp and keep `reviewed_at` null; if the transition moves a submitted timesheet to `approved` or `rejected`, set `reviewed_at` to the current timestamp; if the outcome is `rejected`, persist `rejection_reason`, otherwise clear it unless business rules explicitly preserve a prior rejected value. Never invent or write reviewer foreign-key columns that are not present in the schema.
   *
   * Enforce workflow integrity. Reject illegal transitions such as approving a non-submitted timesheet, resubmitting an already approved timesheet, or mutating a finalized timesheet in ways not allowed by business policy. When processing submission, verify that the timesheet has at least one non-deleted inclusion row in `hrm_time_tracking_timesheet_timelogs` and therefore contains timelogs. Also verify that no other non-deleted timesheet exists for the same `hrm_time_tracking_employee_id` and reporting week in a conflicting active state beyond the table's unique week constraint and the business rule that duplicate submitted or approved weekly submissions must be blocked.
   *
   * For approval, load linked `hrm_time_tracking_timesheet_timelogs` rows and their `hrm_time_tracking_timelogs` records in the same transaction. Mark the timesheet as approved and enforce the lock semantics through downstream service rules so included timelogs cannot be edited or deleted afterward. Because the loaded timelog schema has no explicit lock column, implement this by checking approved-timesheet membership during later timelog update and delete flows rather than by inventing new persisted fields here.
   *
   * Execute the update in a transaction covering timesheet validation, state mutation, and any required consistency checks against included timelogs. Return the refreshed timesheet resource after commit. If any dependency or downstream processing times out before the result is known, return a clear failure outcome and do not report the update as successful.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":timesheetId")
  public async update(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.IUpdate,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await putHrmTimeTrackingEmployeeTimesheetsTimesheetId({
        employee,
        timesheetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a single weekly timesheet record from the current organization context.
   *
   * This operation deletes one timesheet identified by `timesheetId`. The underlying `hrm_time_tracking_timesheets` record represents a weekly Monday-to-Sunday reporting period owned by one employee and scoped to one organization. As described by the database schema, the timesheet stores workflow information such as `status`, `submitted_at`, `reviewed_at`, and `rejection_reason`, while its included timelogs are normalized through `hrm_time_tracking_timesheet_timelogs`. The delete behavior must therefore evaluate both the target timesheet identity and its workflow state before removal is allowed.
   *
   * Access to this endpoint is organization-scoped. An employee may remove only a timesheet that belongs to that employee when the timesheet is still in a deletable state. Owners and managers may use this endpoint only when their organization authority includes time-management capability for workforce time records. Requests for timesheets outside the caller's currently selected organization must be rejected even when the identifier exists elsewhere.
   *
   * This operation is closely related to timesheet detail and list retrieval APIs because users normally inspect a timesheet and its review state before deciding to remove it. It also affects timelog inclusion records linked through `hrm_time_tracking_timesheet_timelogs`, because those rows exist only to normalize the composition of timelogs inside one timesheet. When deletion succeeds, the system must ensure that the removed timesheet no longer appears in subsequent list or detail queries for the organization.
   *
   * Validation must reject attempts to remove a timesheet that is not found, does not belong to the active organization context, or is locked by a workflow state that should remain preserved for review history or downstream payroll and reporting processes. Error handling should also reject deletion when the caller lacks ownership and does not have elevated time-management authority. Successful deletion returns no response body.
   *
   * @param connection
   * @param timesheetId Target timesheet record identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification 1. Resolve the caller's active organization context and actor identity.
   * 2. Load the target row from `hrm_time_tracking_timesheets` by `id = :timesheetId`, and verify that `hrm_time_tracking_organization_id` matches the caller's current organization. If no matching row exists, return a not-found error.
   * 3. Determine authorization:
   *    - If the caller is an employee, allow only when the target `hrm_time_tracking_employee_id` belongs to that caller's employee identity in the current organization.
   *    - If the caller is an owner or manager, allow only when the caller has organization time-management authority.
   *    - Otherwise reject with a forbidden error.
   * 4. Enforce workflow deletion rules. Deletion is allowed only for timesheet states designated as removable by business policy, and must be rejected for locked review states. At minimum, submitted and approved states must be treated as non-deletable because organization review history must be preserved once the approval workflow has advanced.
   * 5. Perform the removal in a transaction. Delete or mark deleted the target `hrm_time_tracking_timesheets` row according to repository conventions, and ensure all linked `hrm_time_tracking_timesheet_timelogs` inclusion rows are removed consistently. The schema relation already defines cascade behavior from timesheet inclusions, so implementation should rely on that relational integrity while keeping the operation transactional.
   * 6. After commit, ensure subsequent list and detail queries in the current organization no longer expose the deleted timesheet. Return success with no response body.
   * 7. Error cases to handle explicitly: unknown timesheet ID, organization-scope mismatch, insufficient permission, and invalid workflow state for deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":timesheetId")
  public async erase(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingEmployeeTimesheetsTimesheetId({
        employee,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Submit a draft weekly timesheet for approval review.
   *
   * This operation transitions a single weekly timesheet record from the draft workflow state to the submitted workflow state. The underlying timesheet entity is the organization-scoped weekly record stored in `hrm_time_tracking_timesheets`, which belongs to one employee account and covers a Monday-to-Sunday reporting period through `week_start_date` and `week_end_date`. Submission records the `submitted_at` timestamp and makes the timesheet immediately available in the review queue for users who can approve timesheets within the same organization.
   *
   * This endpoint is intended for the employee who owns the target timesheet. The service must verify that the authenticated employee is the owner of the `hrm_time_tracking_timesheets` record identified by `timesheetId`. In addition, the service must respect employee lifecycle restrictions described by the workforce rules: an employee in deactivated status cannot submit timesheets, although historical timelogs and historical timesheets remain preserved. Because the employee authentication identity is stored separately from organization-scoped workforce state, the implementation must validate both the authenticated account and the employee's active participation state in the selected organization context.
   *
   * The submission workflow depends on the normalized inclusion records in `hrm_time_tracking_timesheet_timelogs`. A draft timesheet may be submitted only when it contains at least one included timelog. The service should therefore evaluate active inclusion rows for the target timesheet and, when needed, join to `hrm_time_tracking_timelogs` to ensure the included entries exist and remain valid for the employee and organization context. The timesheet table intentionally does not persist calculated totals, so any total-hours presentation after submission should be derived from the linked timelog durations rather than a stored aggregate field.
   *
   * The operation must enforce business-state validation before changing the record. A timesheet can be submitted only from the `draft` status. The system must reject submission if the target timesheet is already `submitted`, `approved`, or `rejected` at the moment of the request. The system must also reject submission if another timesheet for the same employee and the same week is already in `submitted` or `approved` status. This rule preserves one active approval context per employee-week and aligns with the unique weekly ownership model centered on `hrm_time_tracking_employee_id` and `week_start_date`.
   *
   * After a successful submission, clients commonly use the returned resource to refresh employee-facing weekly status displays, including the personal dashboard current-week timesheet status. This endpoint therefore works naturally with detail retrieval operations for timesheets and reviewer queue operations that surface submitted timesheets awaiting approval. If the client needs the full list of included timelogs or recalculated weekly totals for display, it should subsequently call the appropriate timesheet detail retrieval endpoint after this submission completes.
   *
   * If validation fails, the service must reject the request without changing the timesheet status or submission timestamp. Typical failure cases include a missing timesheet, ownership mismatch, inactive employee status, no included timelogs, conflicting same-week submitted or approved timesheets, or an invalid current status. These failures preserve the integrity of the weekly reporting workflow and prevent accidental entry of incomplete or duplicate approval submissions.
   *
   * @param connection
   * @param timesheetId Target timesheet ID
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Load the target `hrm_time_tracking_timesheets` row by `id = :timesheetId` and `deleted_at IS NULL`.
   *
   * Resolve the authenticated actor to the organization-scoped employee context for the selected organization. Confirm that the authenticated employee owns the target timesheet by matching `hrm_time_tracking_timesheets.hrm_time_tracking_employee_id` to the authenticated employee account identity used by this service. Reject with not found or forbidden when the record is outside the caller's accessible organization boundary.
   *
   * Validate employee eligibility before the state transition. Use the workforce state source for the employee in the current organization to ensure the employee is active. If the employee is deactivated, reject the submission request.
   *
   * Validate current workflow status. Allow execution only when `status = 'draft'`. Reject when the current status is `submitted`, `approved`, or `rejected`, or any unexpected value.
   *
   * Verify that the target timesheet contains at least one active inclusion record in `hrm_time_tracking_timesheet_timelogs` for `hrm_time_tracking_timesheet_id = :timesheetId` and `deleted_at IS NULL`. If none exist, reject the submission.
   *
   * Check for conflicting same-week approval contexts by querying `hrm_time_tracking_timesheets` for rows with the same `hrm_time_tracking_employee_id` and same `week_start_date`, excluding the target `id`, with `deleted_at IS NULL` and `status IN ('submitted','approved')`. If any exist, reject the submission.
   *
   * Perform the state transition in a transaction. Update the target timesheet row by setting `status = 'submitted'`, `submitted_at = now()`, and `updated_at = now()`. Do not modify `reviewed_at` or `rejection_reason` during submission.
   *
   * Return the refreshed timesheet detail after the update. If the detail DTO includes derived totals or included timelog information, compute total duration from linked active `hrm_time_tracking_timesheet_timelogs` and `hrm_time_tracking_timelogs` rows instead of reading any persisted aggregate column.
   *
   * Emit or schedule downstream side effects required by the business requirements, including making the submitted timesheet visible in the reviewer queue and refreshing the current-week timesheet status for the owning employee dashboard. These side effects must occur only after the transaction commits successfully.
   *
   * Error handling: return a not-found error when the timesheet does not exist, a forbidden error for ownership or access violations, and a validation/conflict error for inactive employee status, empty timesheet composition, invalid current status, or same-week submitted/approved conflicts. The operation must be idempotency-safe in the sense that failed validations never partially update workflow fields.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/submit")
  public async submit(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingEmployeeTimesheetsTimesheetIdSubmit({
        employee,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Resubmit a previously rejected weekly timesheet for approval.
   *
   * This operation allows the employee who owns a weekly timesheet to send that same week record back into the approval workflow after it has been rejected and returned to draft status. In the hrm time tracking domain, a timesheet is a weekly Monday-to-Sunday reporting record owned by one employee within one organization, and its workflow state is stored on the hrm_time_tracking_timesheets table. Resubmission does not create a new week record. Instead, it changes the existing draft record back into the submitted review stage so that users with timesheet approval responsibility can review it again.
   *
   * Security and organization scoping are critical for this endpoint. The system must evaluate access within the currently selected organization only, and the caller must be the employee who owns the target timesheet in that organization context. A role or permission held in another organization must not grant access here. Reviewers and approvers may later see the resubmitted timesheet in their submitted review queue, but they are not the intended actor for this resubmission action.
   *
   * This operation is backed primarily by the hrm_time_tracking_timesheets model, which stores the organization reference, employee owner reference, reporting week boundaries, status, submission timestamp, review timestamp, and optional rejection reason. The business workflow also depends on the normalized composition between hrm_time_tracking_timesheets and hrm_time_tracking_timelogs through hrm_time_tracking_timesheet_timelogs. Because included timelogs are managed separately, this operation assumes any necessary draft edits have already been completed before resubmission. If the timesheet contains no active included timelogs, the system must reject the submission attempt.
   *
   * The operation is specifically intended for rejected timesheets that have returned to draft state with a preserved rejection reason. The system must reject attempts to resubmit a timesheet that is not currently in a draft state suitable for employee resubmission, such as a still-submitted or already-approved record. It must also prevent duplicate active weekly submission outcomes for the same employee and week, consistent with the rule that another submitted or approved timesheet for that employee and reporting week blocks submission.
   *
   * This endpoint is typically used after draft editing operations on the same timesheet. An employee would first review the rejection reason, adjust the included timelogs or their underlying timelog records as needed, and then call this operation to place the weekly record back into the submitted queue. After success, the updated timesheet state should become visible to the owner, to approvers responsible for submitted timesheets in the same organization, and to downstream organization views such as dashboards, reports, and activity-oriented review surfaces.
   *
   * Expected failures include a missing or inaccessible timesheet, a timesheet outside the current organization context, a caller who is not the owning employee, an invalid workflow status for resubmission, and a draft with no included timelogs. The system should return a clear failure outcome and must not present the action as completed when the workflow transition cannot be confirmed.
   *
   * @param connection
   * @param timesheetId Unique identifier of the timesheet to resubmit
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor employee
   * @x-autobe-specification Implement this action as a workflow transition on hrm_time_tracking_timesheets inside the caller's currently selected organization context.
   *
   * 1. Resolve the authenticated caller as an employee membership in the active organization.
   * 2. Load the target hrm_time_tracking_timesheets row by id, ensuring deleted_at is null and hrm_time_tracking_organization_id matches the active organization.
   * 3. Verify that the loaded timesheet belongs to the caller by matching hrm_time_tracking_employee_id to the caller's employee record in the same organization. If not, reject with a permission error.
   * 4. Verify that the current timesheet status allows resubmission. Based on the requirements, the valid source state for employee resubmission is a draft that originated from a prior rejection. Reject if the timesheet is currently submitted, approved, deleted, or otherwise not eligible.
   * 5. Verify that the timesheet still has at least one active included timelog by querying hrm_time_tracking_timesheet_timelogs for the target hrm_time_tracking_timesheet_id where deleted_at is null, and joining or checking the related hrm_time_tracking_timelogs row is not deleted. If no active included timelogs exist, reject the resubmission.
   * 6. Enforce duplicate weekly submission protection. Check for any other non-deleted hrm_time_tracking_timesheets row for the same hrm_time_tracking_employee_id and same week_start_date in status submitted or approved, excluding the current timesheet id. If such a row exists, reject the action.
   * 7. Update the current timesheet row to status = "submitted" and set submitted_at to the current timestamp. Clear reviewed_at because a new review cycle is starting. Clear rejection_reason because the prior rejection has been addressed and the timesheet is re-entering review. Persist updated_at to the current timestamp.
   * 8. Commit the update transactionally so the status transition and validation are consistent.
   * 9. Return the refreshed timesheet resource.
   *
   * Additional implementation notes:
   * - Do not create a new timesheet row; reuse the same hrm_time_tracking_timesheets record for the same employee and week.
   * - Do not modify timelog composition in this endpoint; additions and removals belong to separate draft-editing operations.
   * - Use organization-scoped authorization only. Permissions from another organization must have no effect.
   * - If concurrent requests attempt to resubmit the same draft, ensure only one successful transition occurs, for example by using transactional status checks.
   * - If downstream real-time or activity publication exists, emit the corresponding state change after the transaction succeeds so approver queues and employee views reflect the new submitted state promptly.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":timesheetId/resubmit")
  public async resubmit(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingTimesheet> {
    try {
      return await postHrmTimeTrackingEmployeeTimesheetsTimesheetIdResubmit({
        employee,
        timesheetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
