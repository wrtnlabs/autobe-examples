import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOrganization } from "../../../../api/structures/IHrmTimeTrackingOrganization";
import { IPageIHrmTimeTrackingOrganization } from "../../../../api/structures/IPageIHrmTimeTrackingOrganization";
import { OwnerAuth } from "../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../decorators/payload/OwnerPayload";
import { deleteHrmTimeTrackingOwnerOrganizationsOrganizationId } from "../../../../providers/deleteHrmTimeTrackingOwnerOrganizationsOrganizationId";
import { getHrmTimeTrackingOwnerOrganizationsOrganizationId } from "../../../../providers/getHrmTimeTrackingOwnerOrganizationsOrganizationId";
import { patchHrmTimeTrackingOwnerOrganizations } from "../../../../providers/patchHrmTimeTrackingOwnerOrganizations";
import { postHrmTimeTrackingOwnerOrganizations } from "../../../../providers/postHrmTimeTrackingOwnerOrganizations";
import { putHrmTimeTrackingOwnerOrganizationsOrganizationId } from "../../../../providers/putHrmTimeTrackingOwnerOrganizationsOrganizationId";

@Controller("/hrmTimeTracking/owner/organizations")
export class HrmtimetrackingOwnerOrganizationsController {
  /**
   * Create a new organization workspace for the requesting user.
   *
   * This operation creates an Organization, which the domain model defines as an independent business tenant within the HRM time tracking platform. The created organization becomes a distinct business space that owns its own members, roles, departments, projects, tasks, timelogs, timesheets, reports, dashboards, and activity history. In line with the organization concept, the created record establishes a new isolated operational environment rather than merely inserting a label or preference object.
   *
   * The creation flow captures the organization's business identity and operational attributes described in the requirements: organization name as the primary business label, optional organization description for business context, optional logo image for visual identity, currency for monetary context, timezone for local time interpretation, and fiscal start month for fiscal-year alignment. These values define both who the organization is and the operating context in which future workforce and time-tracking records will be interpreted.
   *
   * After successful creation, the system must associate the new organization with the creating user and make it available as that user's active workspace, consistent with the sign-up creation workflow requirement. Because the platform supports multi-organization participation while keeping records strictly isolated, this operation must ensure that the new tenant is established independently and does not mix data with any existing organization context. The created organization should then be visible only through the user's organization associations and selected workspace behavior.
   *
   * This operation is related to subsequent organization settings management operations. After creation, organization owners may use settings retrieval and update operations to revise the name, description, logo image, currency, timezone, and fiscal start month for that same organization. This endpoint is only responsible for initial organization creation and association; it does not perform payment setup, OAuth configuration, or any external identity integration because those workflows are explicitly not defined for this platform.
   *
   * @param connection
   * @param body Organization identity and operational settings for creation
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Validate the request body against the Organization creation DTO and persist a new record in the organization table using only fields that exist in the schema for organization identity and operational preferences.
   *
   * Within a single transaction, create the organization, create or assign the creator's ownership relationship required by the business model, and register the new organization as available in the creator's organization associations. If the platform maintains an active organization context pointer for the authenticated account, update that pointer so the created organization becomes the initial or newly selected workspace immediately after success.
   *
   * Enforce the creation semantics from the requirements: capture organization name as required input, accept optional description and logo image if provided, and persist currency, timezone, and fiscal start month as organization-scoped operational settings. Do not create or modify unrelated tenant data such as departments, projects, tasks, timelogs, or reports during this endpoint beyond any mandatory bootstrap records directly required to establish ownership or default workspace behavior.
   *
   * Apply tenant isolation guarantees by ensuring the new organization is created as a separate business boundary and that no existing records from another organization are attached or exposed. On success, return the newly created organization resource. On failure, do not leave partial ownership or association records committed. If any downstream step required to establish the organization workspace fails, reject the operation and roll back the transaction so the client does not receive a misleading successful creation result.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedBody()
    body: IHrmTimeTrackingOrganization.ICreate,
  ): Promise<IHrmTimeTrackingOrganization> {
    try {
      return await postHrmTimeTrackingOwnerOrganizations({
        owner,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of organizations that the authenticated user can access.
   *
   * This operation provides collection-level browsing for organization workspaces in the HRM time tracking platform. An organization is the primary business tenant of the system, and each organization represents an independent workspace with its own employees, projects, departments, time records, reports, dashboards, and activity history. The response should therefore present organization records as tenant entry points rather than as cross-tenant administrative data. The underlying organization entity is based on the organization table that stores the core tenant identity and settings, including the organization name, optional description, optional logo URI used for workspace branding, default currency code, timezone, and fiscal start month.
   *
   * Security and visibility must follow organization membership boundaries. The platform requires organization workspaces to remain independent, and users who belong to multiple organizations may work in only one selected organization context at a time for subsequent actions. Even so, the purpose of this endpoint is to let an authenticated user browse the organizations available to them so they can identify and select an accessible workspace. The operation must never expose organizations unrelated to the caller, and it must evaluate access in the context of the caller's memberships and organization-scoped permissions. Owners, managers, and employees may use this endpoint to discover their accessible workspaces, but the response remains limited to organizations they are actually associated with.
   *
   * The operation is backed by the organization tenant record, which stores the atomic tenant settings used as the parent scope for workforce administration, projects, time tracking, reporting, and other organization-isolated business data. Returned summary data should be derived from active organization records and should exclude records whose deleted_at value indicates they are no longer active. Search and sorting behavior should focus on collection browsing concerns, especially organization name and other safe summary fields appropriate for list presentation.
   *
   * This endpoint is typically used before organization-specific operations are executed. A client may first call this operation to obtain the set of organizations available to the authenticated user, and then use the selected workspace in later organization-scoped APIs where the active context controls authorization and data isolation. Error handling should reject malformed search requests and must not reveal whether inaccessible organizations exist outside the caller's membership scope.
   *
   * @param connection
   * @param body Organization search, filter, sort, and pagination criteria
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Implement this operation as a collection search over hrm_time_tracking_organizations joined with the caller's membership relationship so that only organizations accessible to the authenticated user are returned. The service layer should resolve the authenticated principal, determine the user's linked organization memberships across owner, manager, or employee roles as applicable, and build a query constrained to those organization IDs only.
   *
   * Accept an IHrmTimeTrackingOrganization.IRequest request body containing pagination, search text, optional filtering, and sort options. Support partial text search primarily against the organization name and optionally the description if the request schema includes that capability. Apply deterministic sorting using supported fields such as name, createdAt, or updatedAt, with a stable secondary sort by id when necessary. Exclude logically inactive records by enforcing deleted_at IS NULL.
   *
   * Return a paginated IPageIHrmTimeTrackingOrganization.ISummary response. Each list item should expose summary-safe organization information derived from the table columns, such as id, name, description, logoUri, currencyCode, timezone, fiscalStartMonth, createdAt, and updatedAt, according to the summary DTO definition. Do not include unrelated cross-tenant aggregates or privileged internal data not represented by the DTO.
   *
   * Validate pagination and sort input before query execution. Reject unsupported sort fields, invalid page sizes, and malformed filter structures. If the authenticated user has no accessible organizations, return an empty paginated result rather than an authorization failure. If downstream membership resolution depends on another service or integration and that dependency fails, reject the operation and do not produce misleading partial success. All processing must preserve tenant isolation and must not leak the existence of organizations outside the caller's accessible scope.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedBody()
    body: IHrmTimeTrackingOrganization.IRequest,
  ): Promise<IPageIHrmTimeTrackingOrganization.ISummary> {
    try {
      return await patchHrmTimeTrackingOwnerOrganizations({
        owner,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed organization record for the specified organization identifier.
   *
   * This operation returns the core tenant identity and operational settings stored in the organization record. In the underlying hrm_time_tracking_organizations table, the organization is the parent scope for workforce administration, projects, time tracking, reporting, dashboards, and other organization-isolated business data. The response therefore represents the business tenant itself rather than a subsidiary resource. Returned information should reflect the organization attributes described by the schema and domain analysis, including the organization name used throughout the workspace, the optional description that provides business context, the optional logo URI used for branding, the default currency code, the IANA timezone that defines local operating time interpretation, and the fiscal start month that defines the beginning of the tenant's fiscal year.
   *
   * Access to this operation must be evaluated in the current organization context. The requirements state that each organization is an independent business tenant and that organization data is strictly isolated from other organizations. A caller who belongs to multiple organizations must only receive data for the organization they are authorized to access in the active organization context. If the supplied organizationId refers to a record outside that authorized context, the operation must be denied rather than exposing whether unrelated tenant data exists. Role-based access must also be evaluated separately for the current organization, so permissions granted in one organization must not authorize reading another organization's record.
   *
   * This operation is closely related to organization settings and other organization-scoped APIs. Clients typically use this endpoint when opening organization settings, rendering workspace branding and operational preferences, or confirming the current tenant configuration before browsing departments, employees, projects, reports, dashboards, and time-tracking data. Those downstream APIs depend on the organization boundary represented by this record. As a result, callers commonly execute this endpoint before organization-scoped management screens that need the tenant's display and operational metadata.
   *
   * Implementation must only return an active organization record that is available to the caller's membership context. The hrm_time_tracking_organizations schema includes created_at and updated_at for lifecycle metadata and deleted_at to indicate that the organization is no longer active. If the target record has been removed from active use or is not visible to the caller's authorized organization scope, the operation must fail cleanly without leaking data across tenants. Since this is a read-only endpoint, it does not trigger external integrations or modify related records, but any authorization or lookup failure must still be handled as a failed read for the current organization context.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Load the organization from hrm_time_tracking_organizations by primary key id using the organizationId path parameter.
   *
   * Before returning data, verify that the authenticated user has membership or equivalent authorized access to the target organization in the current organization context. Apply organization-scoped access evaluation only within the selected organization, and reject the request when the target organization is outside that scope or when the caller lacks permission to view organization information in that organization.
   *
   * Query only one organization record and exclude logically removed records by requiring deleted_at to be null unless the platform's internal authorization policy explicitly allows historical retrieval, which is not indicated for this endpoint. Map the resulting record fields id, name, description, logo_uri, currency_code, timezone, fiscal_start_month, created_at, and updated_at into the IHrmTimeTrackingOrganization response DTO.
   *
   * Return a not-found style failure when no active organization matches the given id within the caller's allowed scope. Return a forbidden style failure when the caller is authenticated but not permitted to view the target organization in the current context. Do not attempt cross-organization fallback, alternate-tenant lookup, or disclosure of records from another organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":organizationId")
  public async at(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingOrganization> {
    try {
      return await getHrmTimeTrackingOwnerOrganizationsOrganizationId({
        owner,
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the identity and operational settings of a single organization tenant.
   *
   * This operation modifies the core organization record that defines one independently operated tenant within the HRM time-tracking platform. The target resource is the organization identified by `organizationId`, and the update applies only to atomic organization settings stored in `hrm_time_tracking_organizations`, including the organization name, optional description, optional logo image URI, default currency code, timezone, and fiscal start month. These fields represent the organization's business identity and operating context, which the schema describes as the parent scope for workforce administration, projects, time tracking, reporting, and other organization-isolated business data.
   *
   * Access to this operation is restricted to the owner of the currently selected organization. The requirements explicitly state that organization settings changes must be allowed only when the requester is an owner in the current organization context, and must be rejected for users who belong to the organization but are not owners. Because organization data is strictly isolated, the update must affect only the selected organization and must not alter any other organization that the same user may also belong to.
   *
   * The operation is backed by the `hrm_time_tracking_organizations` table, whose columns define the organization's primary business label (`name`), optional business summary (`description`), optional workspace branding image (`logo_uri`), monetary context (`currency_code`), local operating time context (`timezone`), and fiscal calendar start month (`fiscal_start_month`). The request must be validated against these real persisted attributes rather than inferred fields. Audit timestamps such as `created_at` and `updated_at`, and lifecycle control such as `deleted_at`, are managed by the system and are not client-managed settings.
   *
   * Clients typically call this operation from an organization settings screen after first loading the current organization details through the corresponding detail retrieval endpoint for the same organization. After successful completion, clients should use the returned organization payload to refresh displayed tenant settings so that branding, timezone-sensitive interpretation, currency display, and fiscal-year context remain aligned with the persisted record.
   *
   * If the target organization does not exist in the current scope, is no longer active for update, or the requester is not authorized as an owner in the active organization context, the operation must fail without mutating any unrelated organization data. If any downstream integration is involved during update processing, the system must report the action as failed rather than partially successful, preserving consistency within the same organization boundary.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param body Updated organization identity and operational settings
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Implement this operation as a transactional update of one row in `hrm_time_tracking_organizations`.
   *
   * 1. Resolve the authenticated user and current organization context.
   * 2. Verify that the current organization context matches the `organizationId` path parameter. Reject the request if the caller attempts to update a different organization than the one currently selected.
   * 3. Authorize only organization owners. Membership in the organization alone is insufficient.
   * 4. Load the target organization by `id` from `hrm_time_tracking_organizations` and ensure it is eligible for update. Treat records with `deleted_at` set as non-updatable.
   * 5. Validate the request body against organization settings rules:
   *    - `name` is the primary business label and must be present when required by the update DTO.
   *    - `description` is optional business context.
   *    - `logo_uri`, if provided, must be stored as the organization's branding URI.
   *    - `currency_code` must represent the organization's default monetary context.
   *    - `timezone` must be a valid IANA timezone identifier used as the tenant's local operating time context.
   *    - `fiscal_start_month` must be an integer month from 1 through 12.
   * 6. Persist only the allowed atomic settings columns: `name`, `description`, `logo_uri`, `currency_code`, `timezone`, `fiscal_start_month`, and refresh `updated_at`.
   * 7. Do not modify related organization-scoped entities such as roles, departments, employees, projects, timelogs, timesheets, reports, or dashboards in this operation.
   * 8. Return the updated organization record mapped to `IHrmTimeTrackingOrganization`.
   *
   * Error handling:
   * - Reject with authorization failure when the requester is not an owner in the current organization.
   * - Reject with not-found or unavailable when the organization does not exist or is not updatable.
   * - Reject validation failures for invalid timezone, invalid fiscal month range, malformed logo URI policy violations, or other DTO-level invalid input.
   * - If an external dependency is invoked and fails, surface the action as failed and do not leave a partially applied organization update.
   *
   * Implementation notes:
   * - Keep all reads and writes scoped to the current organization boundary.
   * - Never use roles or permissions from another organization to authorize this update.
   * - Update only the tenant settings row; this endpoint is not a bulk update and must affect exactly one organization.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":organizationId")
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOrganization.IUpdate,
  ): Promise<IHrmTimeTrackingOrganization> {
    try {
      return await putHrmTimeTrackingOwnerOrganizationsOrganizationId({
        owner,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently delete an organization tenant when all organization deletion preconditions have been satisfied.
   *
   * This operation removes a single organization from the HRM time tracking platform. The organization is defined in the requirements as an independent business tenant that owns its members, roles, departments, projects, tasks, timelogs, timesheets, reports, dashboards, and activity history within one isolated business space. Deleting the organization therefore removes that tenant workspace itself and ends access to its organization-scoped records through that context.
   *
   * Only an organization owner may execute this operation for the targeted organization. The request must be evaluated in the caller's active organization context, and the system must reject the request if no organization context is selected, if the caller is no longer associated with the organization, or if the caller attempts to act on data from another organization. After deletion completes, any later attempt to access the deleted organization must also be rejected because the user's association with that organization is removed as part of the workflow.
   *
   * Before deletion is performed, the system must verify the business preconditions stated in the requirements. Organization deletion cannot proceed while the organization still has unresolved pending timesheets or any active employee contracts. These checks protect ongoing workforce and approval processes from being destroyed before they are closed properly. If either condition is found, the operation must fail without partial deletion.
   *
   * When deletion succeeds, the system permanently removes organization-scoped operational data associated with the tenant, including employees, projects, tasks, timelogs, and timesheets, as explicitly required by the business rules. The owner's user account is retained because account identity exists independently from a deleted organization, but the retained owner account must no longer remain associated with the deleted organization. This operation is typically used only after the owner has reviewed organization state and resolved remaining operational dependencies.
   *
   * @param connection
   * @param organizationId Unique identifier of the organization to permanently remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor owner
   * @x-autobe-specification Implement this operation as an owner-only organization-scoped destructive workflow.
   *
   * 1. Authenticate the caller and resolve the active organization context.
   * 2. Validate that an organization context is selected and that it matches the organizationId path parameter. Reject when the caller is attempting to delete an organization outside the current context or one they do not belong to.
   * 3. Verify that the caller has owner authority for the target organization. Managers and employees must not be allowed to execute this operation.
   * 4. Load the target organization by organizationId and fail if it does not exist or is not accessible in the caller's current organization context.
   * 5. Check whether any timesheets in the target organization remain in a pending state. If any pending timesheet exists, reject the deletion request.
   * 6. Check whether any employee contracts in the target organization remain active. If any active contract exists, reject the deletion request.
   * 7. Execute deletion in a transaction that removes organization-scoped records belonging to the tenant according to the required deletion effects. This workflow must permanently remove the organization and the required dependent records for employees, projects, tasks, timelogs, and timesheets. Ensure dependent child records such as memberships, assignments, and related links are removed in a referentially safe order.
   * 8. Retain the caller's user account and remove its association with the deleted organization so the retained account can continue to exist outside that tenant.
   * 9. Commit only if all destructive steps succeed. On failure, roll back the entire transaction to avoid partial tenant removal.
   * 10. Return success with no response body.
   *
   * Error handling requirements:
   * - Reject if no organization context is selected.
   * - Reject if the caller does not belong to the target organization or is acting under a different active organization.
   * - Reject if the caller is not an owner of the target organization.
   * - Reject if pending timesheets exist.
   * - Reject if active employee contracts exist.
   * - Reject if the organization has already been deleted or cannot be found in the authorized scope.
   *
   * Implementation note: after successful deletion, subsequent requests referencing the deleted organization must be treated as inaccessible because membership and organization association have been removed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":organizationId")
  public async erase(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingOwnerOrganizationsOrganizationId({
        owner,
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
