import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOrganization } from "../../../../api/structures/IHrmTimeTrackingOrganization";
import { EmployeeAuth } from "../../../../decorators/EmployeeAuth";
import { EmployeePayload } from "../../../../decorators/payload/EmployeePayload";
import { putHrmTimeTrackingEmployeeOrganizationsOrganizationId } from "../../../../providers/putHrmTimeTrackingEmployeeOrganizationsOrganizationId";

@Controller("/hrmTimeTracking/employee/organizations/:organizationId")
export class HrmtimetrackingEmployeeOrganizationsController {
  /**
   * Update the identity and operational preference settings of a single organization workspace.
   *
   * This operation allows an authorized organization owner to modify the core tenant settings stored in the `hrm_time_tracking_organizations` record for the selected workspace. The underlying organization model is the primary tenant container for workforce administration, projects, time tracking, reporting, and other organization-isolated business data. The mutable settings exposed by this operation correspond directly to the atomic organization fields described in the schema and requirements: the organization name used throughout the workspace, the optional organization description, the optional logo URI used for workspace branding, the default currency code used for financial and compensation display, the IANA timezone identifier that defines the organization's local operating context, and the fiscal start month that determines the business calendar boundary.
   *
   * Security and tenancy boundaries are strict. The requirements state that organization identity and operational preference updates are performed by an organization owner, and role evaluation is always applied within the currently selected organization context only. As a result, the caller must have sufficient authority in the active organization before any change is accepted. Even if the same user belongs to multiple organizations, this operation must update only the organization identified by the request path and must never permit a role or context from another organization to influence authorization or data access.
   *
   * This operation is backed by the `hrm_time_tracking_organizations` table, which represents an independent business tenant. The returned resource should reflect the latest persisted values for `name`, `description`, `logo_uri`, `currency_code`, `timezone`, and `fiscal_start_month`, together with the organization identity and timestamps maintained by the platform. Because the organization record acts as the parent scope for invitations, roles, departments, employees, projects, timelogs, timesheets, and reports, changes made here affect how that tenant is presented and configured in subsequent workspace usage, but they do not alter unrelated business records.
   *
   * Validation must ensure that only fields actually supported by the organization schema are accepted. The platform should reject attempts to update an organization outside the active tenant scope, reject unauthorized requests, and return a clear failure outcome if the target organization does not exist or is not accessible in the current context. If the client updates branding or preference fields successfully, subsequent reads of organization settings and other workspace views should expose the new values consistently. This operation does not depend on any third-party integration or payment workflow, so no external side effect should be assumed.
   *
   * This operation is commonly used after an owner has opened organization settings from the workspace administration area. Related follow-up reads may use organization detail retrieval endpoints to confirm persisted settings, and other organization-scoped APIs will consume the updated preferences implicitly after this change is saved.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier
   * @param body Organization identity and preference updates
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor employee
     * @x-autobe-specification Implement this operation as a tenant-scoped
     *   update on `hrm_time_tracking_organizations`.
   *
   * 1. Resolve the caller's active organization context and verify that it matches `organizationId` from the path. Do not permit cross-organization updates, even if the authenticated user belongs to multiple organizations.
   * 2. Authorize only callers who have organization-owner level authority for the current organization context, as required by the loaded organization update requirements.
   * 3. Load the target organization by `id` using `deleted_at IS NULL` semantics so inactive or deleted organization records are not updated.
   * 4. Validate the request body against the update DTO and map only supported mutable fields: `name`, `description`, `logo_uri`, `currency_code`, `timezone`, and `fiscal_start_month`. Do not modify immutable fields such as `id`, `created_at`, or lifecycle timestamps other than `updated_at`.
   * 5. Apply business validation appropriate to each field: require a non-empty organization name when provided, ensure `fiscal_start_month` remains within 1 through 12, accept only a valid timezone identifier format supported by the platform, and treat `logo_uri` as an optional URI string. Preserve nullable semantics for optional fields such as `description` and `logo_uri` according to the DTO definition.
   * 6. Perform the update in a single transaction, set `updated_at` to the current server timestamp, and return the fully refreshed organization record after persistence.
   * 7. On failure, return authorization or not-found behavior appropriate to the platform, and never partially apply an organization preference change.
   *
   * No external integration call is required. The implementation should remain limited to the organization table and authorization context evaluation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @EmployeeAuth()
    employee: EmployeePayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOrganization.IUpdate,
  ): Promise<IHrmTimeTrackingOrganization> {
    try {
      return await putHrmTimeTrackingEmployeeOrganizationsOrganizationId({
        employee,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
