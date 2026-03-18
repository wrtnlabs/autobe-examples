import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingProjectMembership } from "../../../../../../structures/IErpHrmTimeTrackingProjectMembership";

/**
 * Bulk-assign multiple employees to a single project within the currently selected organization context.
 *
 * The request targets the project identified by `projectId` and creates one `erp_hrm_time_tracking_project_memberships` record per `(project_id, employee_id)` pair. Each membership includes a `membership_role` that drives project-specific authorization decisions (e.g., member vs project-lead responsibility for task management) for the employee within that project.
 *
 * This endpoint is designed to support onboarding multiple participants at once. It must enforce project scoping so that the referenced project belongs to the same organization context as the authenticated member session.
 *
 * For each assignment, the service must validate that the referenced employee is eligible to participate in the project’s organization context and that the same employee is not assigned to the same project more than once. When assignments are valid, the service inserts the membership records (or updates/reactivates existing inactive records if the implementation treats `deleted_at` as an inactive marker).
 *
 * This endpoint also supports the domain rule that an employee may belong to multiple projects at the same time: adding memberships for different projects must not be rejected due to the employee already having other project memberships.
 *
 * If any assignment item is invalid (e.g., the employee is not eligible in this organization, the `membership_role` is not acceptable for the role field, or the project is not accessible to the requester), the operation must return an error describing the failing condition(s) and must not partially create memberships without an explicit transactional strategy.
 *
 * Related flow: a client can first retrieve the current assigned projects list for the employee and/or the project membership state, then use this bulk assign to add participants in one request. For member role changes and removals, dedicated membership operations should be used instead of this bulk assignment endpoint.
 *
 * Authorization: only members who are allowed to manage project memberships for the target project within the current organization context may call this operation.
 *
 * @param props.connection
 * @param props.projectId Target project identifier to which employees will be assigned.
 * @param props.body Bulk assignment payload specifying the employees to add to the project and their `membership_role` for each assignment.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Realize implementation steps:
 *
 * 1) Authentication & authorization
 * - Resolve the caller’s selected organization context from the session.
 * - Load the target project by `projectId` and ensure `erp_hrm_time_tracking_projects.erp_hrm_time_tracking_organization_id` matches the selected organization.
 * - Enforce authorization to manage project memberships in this project. Use existing project membership/project role logic (membership_role) to determine whether the caller is allowed.
 *
 * 2) Parse and validate request body
 * - For each item in `assignments`:
 *   - Validate `employeeId` format and required fields are present.
 *   - Validate `membershipRole` is one of the acceptable values for `erp_hrm_time_tracking_project_memberships.membership_role` (string values).
 *
 * 3) Eligibility checks per item
 * - For each employeeId, verify the employee exists and belongs to the same organization as the project. (Use `erp_hrm_time_tracking_members.employee_id` -> `erp_hrm_time_tracking_members` join to organization boundary through its schema relations to organization.)
 * - If an employee is not eligible, record a per-item error.
 *
 * 4) Duplicate handling
 * - For the set of requested employeeIds, query existing `erp_hrm_time_tracking_project_memberships` rows with the same `project_id` and `employee_id`.
 * - If duplicates exist:
 *   - If the implementation uses `deleted_at` to mark inactive memberships, decide whether to treat requested assign as re-activation (set deleted_at to null / update membership_role).
 *   - Otherwise reject duplicates with a clear validation error.
 * - Ensure that this validation is scoped to the same project (different projects are independent).
 *
 * 5) Transaction & persistence
 * - Use a single database transaction for all requested items to ensure consistency.
 * - Create or update the membership records accordingly.
 * - Update `membership_role`, `updated_at` as required by ORM behavior.
 *
 * 6) Response
 * - Return a summary list of the memberships created/updated for each assignment item (at minimum: membership id and effective employeeId and membershipRole). Ensure response aligns with the DTO contract for `I...BulkAssign` response.
 *
 * Error handling
 * - Return 400-series validation errors for invalid roles, ineligible employees, or inaccessible project.
 * - Avoid partially applied writes; if partial writes would occur, return an error and roll back.
 *
 * Performance
 * - Batch queries for employees and existing memberships to avoid N+1 queries.
 * @path /erpHrmTimeTracking/member/projects/:projectId/memberships/bulkAssign
 * @accessor api.functional.erpHrmTimeTracking.member.projects.memberships.bulkAssign.bulkAssignProjectMemberships
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function bulkAssignProjectMemberships(
  connection: IConnection,
  props: bulkAssignProjectMemberships.Props,
): Promise<bulkAssignProjectMemberships.Response> {
  return true === connection.simulate
    ? bulkAssignProjectMemberships.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...bulkAssignProjectMemberships.METADATA,
          path: bulkAssignProjectMemberships.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace bulkAssignProjectMemberships {
  export type Props = {
    /**
     * Target project identifier to which employees will be assigned.
     */
    projectId: string & tags.Format<"uuid">;

    /**
     * Bulk assignment payload specifying the employees to add to the project and their `membership_role` for each assignment.
     */
    body: IErpHrmTimeTrackingProjectMembership.ICreate;
  };
  export type Body = IErpHrmTimeTrackingProjectMembership.ICreate;
  export type Response = IErpHrmTimeTrackingProjectMembership;

  export const METADATA = {
    method: "POST",
    path: "/erpHrmTimeTracking/member/projects/:projectId/memberships/bulkAssign",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/erpHrmTimeTracking/member/projects/${encodeURIComponent(props.projectId ?? "null")}/memberships/bulkAssign`;
  export const random = (): IErpHrmTimeTrackingProjectMembership =>
    typia.random<IErpHrmTimeTrackingProjectMembership>();
  export const simulate = (
    connection: IConnection,
    props: bulkAssignProjectMemberships.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: bulkAssignProjectMemberships.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("projectId")(() => typia.assert(props.projectId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
