import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmOrganization } from "../../../../api/structures/IErpHrmOrganization";
import { IPageIErpHrmOrganization } from "../../../../api/structures/IPageIErpHrmOrganization";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteErpHrmMemberOrganizationsOrganizationId } from "../../../../providers/deleteErpHrmMemberOrganizationsOrganizationId";
import { getErpHrmMemberOrganizationsOrganizationId } from "../../../../providers/getErpHrmMemberOrganizationsOrganizationId";
import { patchErpHrmMemberOrganizations } from "../../../../providers/patchErpHrmMemberOrganizations";
import { postErpHrmMemberOrganizations } from "../../../../providers/postErpHrmMemberOrganizations";
import { putErpHrmMemberOrganizationsOrganizationId } from "../../../../providers/putErpHrmMemberOrganizationsOrganizationId";

@Controller("/erpHrm/member/organizations")
export class ErphrmMemberOrganizationsController {
  /**
   * Create a new organization in the ERP HRM platform.
   *
   * This operation registers a brand-new organization under the currently authenticated member's account. The authenticated member becomes the owner of the created organization, holding the highest authority including the ability to manage roles, invite members, and delete the organization. As specified in the `erp_hrm_organizations` schema, every organization must have a unique display name across the platform, a default currency code (e.g., USD, EUR, KRW), an IANA timezone identifier (e.g., Asia/Seoul, America/New_York), and a fiscal start month (1–12) representing the beginning of the organization's fiscal year.
   *
   * Once created, the organization becomes a fully isolated tenant-level scope container. All domain entities subsequently created within the organization — including members, departments, projects, tasks, timelogs, timesheets, contracts, and activity logs — are strictly scoped to this organization and are invisible to members of other organizations, even if they share the same platform-level user account.
   *
   * An optional description may be provided to give additional context about the organization's purpose or structure. An optional logo URL may be provided for branding purposes; it must be a valid URI pointing to an image resource.
   *
   * The requesting member is automatically assigned as the organization owner. A corresponding `erp_hrm_organization_members` record is created to establish the member's per-organization identity within the newly created organization. The owner role is automatically assigned to the creating member.
   *
   * Related operations: After creating an organization, you may invite additional members via `POST /organizations/{organizationId}/invitations`, create departments via `POST /organizations/{organizationId}/departments`, and set up custom roles via `POST /organizations/{organizationId}/roles`.
   *
   * @param connection
   * @param body Creation input for a new organization, including name, currency, timezone, fiscal start month, and optional description and logo URL.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member from the
     *   current session. If not authenticated, return 401. 2. Validate the
     *   request body: - `name`: Required, non-empty string. Check uniqueness in
     *   erp_hrm_organizations (@@unique([name])). If a record with the same
     *   name already exists (and deleted_at is null), return 409 Conflict. -
     *   `currency`: Required, non-empty string (e.g., ISO 4217 currency code
     *   like 'USD', 'EUR', 'KRW'). - `timezone`: Required, valid IANA timezone
     *   identifier string (e.g., 'Asia/Seoul', 'America/New_York'). -
     *   `fiscal_start_month`: Required, integer between 1 and 12 inclusive. -
     *   `description`: Optional, nullable string. - `logo_url`: Optional,
     *   nullable URI string (max 80000 chars as per schema VarChar(80000)). 3.
     *   Begin a database transaction. 4. Insert a new row into
     *   `erp_hrm_organizations`: - `id`: Generate a new UUID. -
     *   `owner_member_id`: Set to the authenticated member's ID. - `name`: From
     *   request body. - `description`: From request body (nullable). -
     *   `logo_url`: From request body (nullable). - `currency`: From request
     *   body. - `timezone`: From request body. - `fiscal_start_month`: From
     *   request body. - `created_at`: Current timestamp. - `updated_at`:
     *   Current timestamp. - `deleted_at`: null. 5. Create an
     *   `erp_hrm_organization_members` record linking the authenticated member
     *   to the newly created organization with the Owner role. 6. Assign the
     *   built-in Owner role to this organization member. 7. Commit the
     *   transaction. 8. Return the newly created organization record as
     *   `IErpHrmOrganization`. 9. If any step fails, roll back the transaction
     *   and return appropriate error responses.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmOrganization.ICreate,
  ): Promise<IErpHrmOrganization> {
    try {
      return await postErpHrmMemberOrganizations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated and filtered list of organizations accessible to the currently authenticated member.
   *
   * This operation returns all organizations that the authenticated member belongs to, presented as a paginated summary list. Each organization in the ERP HRM platform acts as a fully isolated top-level scope container (tenant) for all domain entities including members, departments, projects, tasks, timelogs, timesheets, contracts, roles, and activity logs. No cross-organization data is ever exposed.
   *
   * The authenticated member may belong to one or more organizations. This endpoint is the primary mechanism for discovering and selecting which organization context to work within. When a member logs in and belongs to multiple organizations, they must select an organization context before proceeding; this endpoint provides the list of available choices.
   *
   * The request body supports filtering by organization name (partial match), currency, timezone, and date ranges for creation timestamps. Results are paginated with configurable page sizes and sortable by name, creation date, or other relevant fields. Only active (non-deleted) organizations the member belongs to are included in the results; organizations whose `deleted_at` column is set are excluded.
   *
   * This endpoint is closely related to the organization context-switching flow. After obtaining the list of organizations via this endpoint, the member selects one to establish their active organization context. All subsequent operations are then scoped to the selected organization, as enforced by the multi-tenancy isolation rules described in the platform's data isolation policy.
   *
   * Related operations:
   * - `GET /organizations/{organizationId}` — retrieve full details of a specific organization after identifying it from this list.
   * - `PUT /organizations/{organizationId}` — update an organization's settings (requires Owner or Manager privileges within that organization).
   *
   * @param connection
   * @param body Search criteria, filtering options, and pagination parameters for listing organizations
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member via their
     *   session token. Extract the member's identity (erp_hrm_members.id). 2.
     *   Join erp_hrm_organization_members with erp_hrm_organizations to find
     *   all organizations where the authenticated member has an active
     *   membership (erp_hrm_organization_members.erp_hrm_member_id =
     *   authenticated member id, and the organization's deleted_at IS NULL). 3.
     *   Apply optional search filters from the request body: - name:
     *   case-insensitive partial match against erp_hrm_organizations.name -
     *   currency: exact match against erp_hrm_organizations.currency -
     *   timezone: exact match against erp_hrm_organizations.timezone -
     *   createdAt range: filter by erp_hrm_organizations.created_at between
     *   provided start and end timestamps 4. Apply sorting based on the sort
     *   field and direction specified in the request body (default: created_at
     *   DESC). 5. Apply cursor-based or offset-based pagination using the page
     *   and limit parameters from the request body. 6. Return a paginated
     *   response (IPageIErpHrmOrganization.ISummary) containing the pagination
     *   metadata and the list of organization summaries. 7. Each summary should
     *   include: id, name, description, logo_url, currency, timezone,
     *   fiscal_start_month, owner_member_id, created_at, updated_at. 8. Edge
     *   cases: - If the member belongs to no active organizations, return an
     *   empty paginated result (not an error). - If a filter produces no
     *   matches, return an empty paginated result. - Ensure deleted
     *   organizations (deleted_at IS NOT NULL) are always excluded.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmOrganization.IRequest,
  ): Promise<IPageIErpHrmOrganization.ISummary> {
    try {
      return await patchErpHrmMemberOrganizations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific organization by its unique identifier.
   *
   * This operation returns the full organization record corresponding to the provided UUID, including its display settings (name, description, logo URL), financial configuration (currency), temporal configuration (timezone), and fiscal reporting settings (fiscal_start_month). These settings govern how all data within the organization is interpreted and displayed across the platform.
   *
   * Access to this endpoint is strictly scoped to authenticated members who belong to the target organization. The system enforces per-organization data isolation: a member operating within one organization context cannot retrieve the details of another organization, even if they hold membership in it. Only the currently active organization context is accessible at any given time.
   *
   * The organization record is sourced from the `erp_hrm_organizations` table. The `owner_member_id` field references the platform-level member account (`erp_hrm_members`) that holds the highest authority over the organization. The organization's `timezone` field (an IANA timezone identifier, e.g., `Asia/Seoul`) determines how workday boundaries, timesheet week boundaries, and reporting date ranges are computed. The `fiscal_start_month` (1–12) defines the start of the organization's fiscal year for financial reporting purposes.
   *
   * This endpoint returns a 404 error if the organization does not exist or has been deleted. It returns a 403 error if the requesting member is not authorized to access the requested organization. This operation is typically used to display the organization profile page, load organization settings in the UI, or verify organization configuration before performing other operations.
   *
   * @param connection
   * @param organizationId The unique UUID identifier of the target organization (global scope).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Extract organizationId from the path parameter
     *   (UUID format). 2. Verify the requesting member's session is
     *   authenticated and their current organization context matches the
     *   requested organizationId. If the member does not belong to the
     *   requested organization or the organization context does not match,
     *   return a 403 Forbidden error. 3. Query the erp_hrm_organizations table
     *   by id = organizationId, filtering out records where deleted_at IS NOT
     *   NULL. 4. If no record is found (non-existent or already deleted),
     *   return a 404 Not Found error. 5. Eagerly load the owner member's
     *   information from erp_hrm_members via owner_member_id for display
     *   purposes. 6. Return the organization record with all fields: id,
     *   owner_member_id, name, description, logo_url, currency, timezone,
     *   fiscal_start_month, created_at, updated_at. 7. Enforce strict
     *   multi-tenant isolation: never return an organization that does not
     *   match the authenticated member's current organization context.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":organizationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmOrganization> {
    try {
      return await getErpHrmMemberOrganizationsOrganizationId({
        member,
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the settings of a specific organization identified by its unique ID.
   *
   * This operation is restricted exclusively to the organization owner. Only the member holding the Owner role within the target organization may modify its core settings. Per the platform's business rules, even members with the `org:manage` permission code on a custom or Manager role are explicitly denied from editing organization-level settings — the Owner role is the sole authorized actor for this operation.
   *
   * The fields that may be updated include the organization's display name, optional description, logo URL, default currency code, IANA timezone identifier, and fiscal year start month.
   *
   * The `erp_hrm_organizations` table serves as the top-level scope container for all domain data in the ERP/HRM platform. Every piece of data — members, departments, projects, tasks, timelogs, timesheets, contracts, and activity logs — belongs to exactly one organization. Updating the organization's settings therefore has a platform-wide effect on how data within it is interpreted and displayed. For example, changing the `timezone` field (an IANA timezone identifier such as `Asia/Seoul` or `America/New_York`) governs how workday boundaries, timesheet week boundaries, and report date ranges are computed for all members. Similarly, changing the `fiscal_start_month` (an integer from 1 to 12 indicating when the fiscal year begins) adjusts the boundaries used for all financial and time reporting periods.
   *
   * The organization `name` must be globally unique across all organizations on the platform, as enforced by the `@@unique([name])` constraint in the database schema. If the requested name is already in use by another organization, the operation will be rejected with a conflict error.
   *
   * This endpoint does NOT handle ownership transfer (changing the `owner_member_id`). That operation is managed by a separate dedicated endpoint. Similarly, organization deletion is a distinct operation that requires all preconditions (resolved timesheets, no active contracts) to be satisfied first.
   *
   * All operations are strictly scoped to the organization context. Only members belonging to the target organization may update its settings. Any request from a member whose active organization context does not match the `organizationId` path parameter will be rejected.
   *
   * After a successful update, the response returns the fully updated organization record reflecting all applied changes, allowing clients to confirm the new state without a separate read request.
   *
   * @param connection
   * @param organizationId The unique UUID identifier of the organization to update.
   * @param body Updated settings for the organization, including name, description, logo URL, currency, timezone, and fiscal start month.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. Authenticate the requesting member session and
     *   confirm the member belongs to the organization identified by
     *   `organizationId`. 2. Verify the requesting member holds the
     *   organization management permission (Owner or Manager role with
     *   org:manage permission) within the target organization. 3. Look up the
     *   `erp_hrm_organizations` record by `id = organizationId` where
     *   `deleted_at IS NULL`. If not found, return 404. 4. If the request body
     *   includes a new `name`, check that no other organization in the system
     *   has the same name (@@unique([name]) constraint). If a duplicate is
     *   found, return 409 Conflict. 5. Validate the `fiscal_start_month` is an
     *   integer between 1 and 12 (inclusive) if provided. 6. Validate that
     *   `timezone` is a valid IANA timezone identifier if provided. 7. Apply
     *   the update to the `erp_hrm_organizations` record: set name,
     *   description, logo_url, currency, timezone, fiscal_start_month from the
     *   request body. Set `updated_at` to the current timestamp. 8. Persist the
     *   changes in a single atomic database transaction. 9. Return the fully
     *   updated `erp_hrm_organizations` record as the response body. 10. Edge
     *   cases: if the caller tries to update an organization they are not a
     *   member of, return 403. If the organization has `deleted_at` set, treat
     *   as 404.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":organizationId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IErpHrmOrganization.IUpdate,
  ): Promise<IErpHrmOrganization> {
    try {
      return await putErpHrmMemberOrganizationsOrganizationId({
        member,
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes an organization and all of its associated data from the platform.
   *
   * This operation is restricted exclusively to the member holding the **Owner** role within the target organization. Any attempt by a non-Owner member will be rejected immediately with an authorization error.
   *
   * Before the deletion is executed, the system enforces two mandatory preconditions that must both be satisfied simultaneously:
   *
   * 1. **All timesheets resolved**: Every `erp_hrm_timesheets` record scoped to this organization must have a `status` of either `approved` or `rejected`. No timesheet may remain in `draft` or `submitted` state. If any unresolved timesheet is found, the request is rejected and the specific precondition violation is communicated to the caller.
   *
   * 2. **No active employee contracts**: There must be no `erp_hrm_employee_contracts` record within the organization whose `start_date` is on or before the current date and whose `end_date` is either null (open-ended) or set to a future date. If any such active contract exists, the request is rejected.
   *
   * When both preconditions are satisfied, the system executes the deletion as a single atomic transaction. The following data is permanently and irreversibly removed: all `erp_hrm_organization_members` records, all `erp_hrm_departments`, all `erp_hrm_projects`, all `erp_hrm_tasks` and their `erp_hrm_task_histories`, all `erp_hrm_timelogs`, all `erp_hrm_timesheets`, all `erp_hrm_timers`, all `erp_hrm_employee_contracts`, all `erp_hrm_roles` (including custom roles), all `erp_hrm_invitations`, and all `erp_hrm_activity_logs` belonging to the organization. If any part of the atomic deletion fails, the entire operation is aborted and all data is preserved in its prior state.
   *
   * The owner's platform-level `erp_hrm_members` account is preserved throughout this process. The owner is simply detached from the deleted organization. If the owner belongs to other organizations, those memberships remain fully intact. Non-owner members' `erp_hrm_members` accounts are equally preserved; only their `erp_hrm_organization_members` records within this organization are removed.
   *
   * Upon successful completion, a real-time organization-deleted event is emitted to all currently connected members scoped to this organization's context, allowing clients to remove the organization from their available context list. There is no recovery path for data deleted via this operation.
   *
   * Related operations: `GET /erpHrm/member/organizations/{organizationId}` to inspect the organization before deletion; `PATCH /erpHrm/member/organizations/{organizationId}/timesheets` to check timesheet statuses; `GET /erpHrm/member/organizations/{organizationId}/employeeContracts` to verify contract states.
   *
   * @param connection
   * @param organizationId The unique identifier (UUID) of the organization to permanently delete.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor member
     * @x-autobe-specification 1. **Authorization check**: Verify the
     *   authenticated member's `erp_hrm_organization_members` record for
     *   `organization_id = organizationId` has a `role_id` that corresponds to
     *   the built-in Owner role. If not, return 403 Forbidden.
   *
   * 2. **Precondition 1 — Timesheets resolved**: Query `erp_hrm_timesheets` where the owning `erp_hrm_organization_members.organization_id = organizationId` and `status IN ('draft', 'submitted')`. If any record exists, return 422 with error code indicating unresolved timesheets.
   *
   * 3. **Precondition 2 — No active contracts**: Query `erp_hrm_employee_contracts` joined to `erp_hrm_organization_members` on `organization_member_id` where `organization_id = organizationId` AND `is_active = true` AND `start_date <= NOW()` AND (`end_date IS NULL` OR `end_date > NOW()`). If any such record exists, return 422 with error code indicating active contracts.
   *
   * 4. **Atomic deletion transaction**: Within a single database transaction, permanently delete the following in an order that respects foreign key constraints:
   *    - `erp_hrm_timers` (via org member cascade)
   *    - `erp_hrm_timelogs` (via org member and project cascade)
   *    - `erp_hrm_timesheets` (via org member cascade)
   *    - `erp_hrm_employee_contracts` (via org member cascade)
   *    - `erp_hrm_task_histories` (via task cascade)
   *    - `erp_hrm_tasks` (via project cascade)
   *    - `erp_hrm_project_members` (via project cascade)
   *    - `erp_hrm_projects` (via org cascade)
   *    - `erp_hrm_activity_logs` (via org cascade)
   *    - `erp_hrm_invitations` (via org cascade)
   *    - `erp_hrm_organization_members` (via org cascade)
   *    - `erp_hrm_departments` (via org cascade)
   *    - `erp_hrm_role_permissions` (via role cascade)
   *    - `erp_hrm_roles` (via org cascade)
   *    - `erp_hrm_organizations` record itself
   *    If any step fails, roll back the entire transaction and return 500.
   *
   * 5. **Real-time event emission**: After the transaction commits successfully, emit an `organization-deleted` event carrying `{ organizationId }` to all WebSocket connections scoped to this organization's context.
   *
   * 6. **Response**: Return HTTP 204 No Content with no body.
   *
   * **Edge cases**:
   * - If `organizationId` does not exist or is already deleted, return 404 Not Found.
   * - Cascade deletions should leverage database-level `onDelete: Cascade` constraints where available (as defined in the Prisma schema) to simplify the service implementation.
   * - The owner's `erp_hrm_members` and any non-owner `erp_hrm_members` records must NOT be deleted; only their org-scoped `erp_hrm_organization_members` records are removed as part of the cascade.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":organizationId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteErpHrmMemberOrganizationsOrganizationId({
        member,
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
