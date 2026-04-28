import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmPlatformOrganization } from "../../../api/structures/IHrmPlatformOrganization";
import { IPageIHrmPlatformOrganization } from "../../../api/structures/IPageIHrmPlatformOrganization";
import { deleteHrmPlatformOrganizationsOrganizationId } from "../../../providers/deleteHrmPlatformOrganizationsOrganizationId";
import { getHrmPlatformOrganizationsOrganizationId } from "../../../providers/getHrmPlatformOrganizationsOrganizationId";
import { patchHrmPlatformOrganizations } from "../../../providers/patchHrmPlatformOrganizations";
import { postHrmPlatformOrganizations } from "../../../providers/postHrmPlatformOrganizations";
import { putHrmPlatformOrganizationsOrganizationId } from "../../../providers/putHrmPlatformOrganizationsOrganizationId";

@Controller("/hrmPlatform/organizations")
export class HrmplatformOrganizationsController {
  /**
   * Create a new organizational tenant on the platform.
   *
   * This endpoint allows authenticated users or new users during signup to establish a new organization. The creator automatically becomes the organization owner with full administrative privileges. Organizations serve as independent business tenants with complete data isolation from other organizations, maintaining their own employees, projects, tasks, and time tracking records.
   *
   * Organization creation requires setting identity attributes (name is required, description and logo_uri are optional) and operational settings (currency uses ISO 4217 standard codes, timezone uses IANA identifiers for time-based operations, and fiscal_start_month defines the fiscal year start date between 1 (January) and 12 (December)).
   *
   * The system validates name uniqueness across the platform, ensures ISO 4217 compliant currency codes, validates IANA timezone identifiers, and restricts fiscal start month to the valid range of 1-12. Upon creation, the authenticated user is assigned as a member with the built-in Owner role, automatically gaining all necessary permissions for organization management.
   *
   * The operation returns the complete organization record including system-generated identifiers and timestamps, enabling immediate use in the created organizational context.
   *
   * @param connection
   * @param body Organization creation request containing required identity attributes and operational settings. Name is required and must be unique across the platform. Currency uses ISO 4217 standard codes (e.g., USD, EUR, KRW). Timezone uses IANA timezone identifiers (e.g., America/New_York, Asia/Seoul). Fiscal start month must be an integer between 1 (January) and 12 (December). Description and logo URI are optional fields for additional organization context.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Query: INSERT new record into
     *   hrm_platform_organizations table.
   *
   * Field mappings:
   * - id: Auto-generate UUID
   * - name: From request body, required, platform-wide unique
   * - description: From request body, nullable
   * - logo_uri: From request body, nullable, max length 80000 characters
   * - currency: From request body, required, valid ISO 4217 format
   * - timezone: From request body, required, valid IANA identifier format
   * - fiscal_start_month: From request body, required, integer between 1 and 12
   * - created_at: System-generated timestamp at creation time
   * - updated_at: System-generated timestamp at creation time
   * - deleted_at: Set to NULL (organization is active)
   *
   * Validation:
   * - Name: required, must be platform-wide unique (check against existing organizations)
   * - Currency: required, must match ISO 4217 compliant currency code
   * - Timezone: required, must match valid IANA timezone identifier
   * - Fiscal start month: required, integer between 1 and 12
   * - Logo URI: optional, if provided must not exceed 80000 characters
   *
   * Post-creation steps:
   * - Insert organization record with all request body fields and system-generated timestamps
   * - Assign authenticated user as organization member with built-in Owner role
   * - Retrieve Owner role permissions and create role-permission associations
   * - Log organization creation event to hrm_platform_activity_logs for audit trail
   * - Return complete organization record including generated id, timestamps, and all configuration settings
   *
   * Error handling:
   * - 409 Conflict if organization name already exists (unique constraint violation)
   * - 400 Bad Request for missing required fields
   * - 400 Bad Request for invalid currency code format
   * - 400 Bad Request for invalid timezone identifier format
   * - 400 Bad Request for fiscal_start_month outside 1-12 range
   * - 400 Bad Request if logo_uri exceeds 80000 character limit
   *
   * Edge cases:
   * - Concurrent name creation attempts: database unique constraint prevents duplicates, return 409
   * - Missing optional fields (description, logo_uri): accept NULL values for organization creation
   * - Timestamp precision: use consistent timestamp format across the platform
   *
   * The operation ensures the organization is immediately available for use with the creator as owner.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody()
    body: IHrmPlatformOrganization.ICreate,
  ): Promise<IHrmPlatformOrganization> {
    try {
      return await postHrmPlatformOrganizations({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * List and search organizations where the authenticated member has an active membership.
   *
   * Returns a paginated list of organization summaries including identity attributes (name, logo) and operational settings (currency, timezone). This endpoint enables members to discover and switch between multiple organizational contexts where they hold active memberships.
   *
   * Members must be authenticated with an active session. Only organizations where the member has an active membership are included in results. Soft-deleted organizations (deleted_at IS NULL) are excluded.
   *
   * @param connection
   * @param body Search criteria including name filter and pagination parameters for filtering and organizing the results.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Query `hrm_platform_organizations` table joined
     *   with the member's active memberships.
   *
   * Filtering logic:
   * - Apply partial match (ILIKE) on organization name if the `name` filter is provided in the request body.
   * - Exclude soft-deleted organizations: `WHERE deleted_at IS NULL`.
   * - Enforce strict scope: only include organizations where the authenticated member has an active membership via internal membership tables.
   *
   * Sorting logic:
   * - Default sort by `name` ascending, or support sorting by `created_at`, `name`, `currency`, or `timezone`.
   *
   * Pagination logic:
   * - Use cursor-based pagination to handle large result sets efficiently.
   *
   * Return organization summary fields:
   * - `id`: unique identifier.
   * - `name`: display name.
   * - `description`: optional description.
   * - `logo_uri`: optional logo image URI.
   * - `currency`: currency code (e.g., USD, EUR, KRW).
   * - `timezone`: timezone setting (e.g., America/New_York, Asia/Seoul).
   * - `fiscal_start_month`: fiscal year start month (1-12).
   * - `created_at`: creation timestamp.
   *
   * Error Handling:
   * - Return 401 Unauthorized if the member is not authenticated with an active session.
   * - Return empty results if the member has no organizational memberships.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody()
    body: IHrmPlatformOrganization.IRequest,
  ): Promise<IPageIHrmPlatformOrganization.ISummary> {
    try {
      return await patchHrmPlatformOrganizations({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single organization's complete information including identity attributes, operational settings, and lifecycle state.
   *
   * This endpoint returns all organization attributes: unique name, description, logo URI, currency code, timezone, fiscal year start month, and timestamps for creation and last update. Organizations serve as the root of data isolation for all scoped entities including employees, projects, and time tracking records. Access is restricted to users with active membership in the organization.
   *
   * The organization must exist and be in an active state (not soft-deleted). If the organization is soft-deleted or does not exist, the API returns a 404 Not Found error. If the user does not have an active membership in the organization, the API returns a 403 Forbidden error.
   *
   * @param connection
   * @param organizationId UUID identifier of the organization to retrieve. Must be an existing, active organization where the requesting user has active membership.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Query hrm_platform_organizations table by primary
     *   key id matching the organizationId path parameter.
   *
   * Validate the organization exists (result is not null).
   *
   * Validate the organization is not soft-deleted (deleted_at IS NULL).
   *
   * Verify authorization: the requesting user must have an active membership in this organization.
   *
   * Return the complete organization entity with all fields: id, name, description, logo_uri, currency, timezone, fiscal_start_month, created_at, updated_at.
   *
   * Edge cases:
   * - If organization with the specified UUID does not exist, return 404 Not Found
   * - If organization is soft-deleted (deleted_at is not NULL), return 404 Not Found
   * - If user does not have an active membership in the organization, return 403 Forbidden
   *
   * Database query: SELECT * FROM hrm_platform_organizations WHERE id = $1 AND deleted_at IS NULL
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":organizationId")
  public async at(
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<IHrmPlatformOrganization> {
    try {
      return await getHrmPlatformOrganizationsOrganizationId({
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update organization settings and configuration including identity attributes and operational parameters. This endpoint allows organization owners to modify the organization's name, description, logo, currency settings, timezone, and fiscal year start month. All updates are scoped to the organization identified by the path parameter and the requesting member must be the organization owner.
   *
   * Organization settings control financial calculations, time tracking behavior, and reporting cycles. Changes to currency affect all pay rates, budgets, and financial reports. Timezone changes impact time tracking operations, scheduling, and report generation. The fiscal year start month determines the organization's fiscal cycle for financial reporting.
   *
   * Updates are applied immediately to the organization record and visible to all organization members. The system maintains an audit trail through organization snapshots for historical tracking and recovery purposes. All modifications require the requesting member to have owner status within the organization.
   *
   * @param connection
   * @param organizationId Organization UUID identifier. The unique identifier that corresponds to the primary key of the organization to be updated. Must be a valid UUID format matching an existing organization record.
   * @param body Organization settings to update including identity attributes and operational configuration parameters. All fields are optional - only provided fields will be updated in the organization record.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Update single organization record in
     *   hrm_platform_organizations table.
   *
   * Validation rules:
   * - Verify organization exists and is not soft-deleted (deleted_at IS NULL)
   * - Verify requesting member is the organization owner
   * - Validate name is provided and unique within the platform (using @@index([name]))
   * - Validate currency is a valid ISO 4217 currency code (e.g., USD, EUR, KRW, JPY)
   * - Validate timezone is a valid IANA timezone identifier (e.g., America/New_York, Asia/Seoul)
   * - Validate fiscal_start_month is an integer between 1 and 12 inclusive
   * - Validate logo_uri length does not exceed 80000 characters
   * - Auto-update updated_at timestamp
   * - Preserve unchanged fields that are not included in the update payload
   *
   * Business rules:
   * - Organization can be updated by owner only
   * - Organization must be in active operational state (not deleted)
   * - No pending timesheet or active contract restrictions apply for updates (only for deletion)
   * - All fields except id and created_at are mutable
   * - Name uniqueness is enforced across all organizations
   * - Changes are immediately visible to all organization members
   * - Snapshot created automatically via hrm_platform_organization_snapshots for audit trail
   *
   * Implementation:
   * 1. Retrieve organization by organizationId
   * 2. Verify organization exists and is not deleted
   * 3. Verify requesting member is organization owner
   * 4. Validate all request body fields
   * 5. Check name uniqueness if name is being changed
   * 6. Apply update to hrm_platform_organizations
   * 7. System automatically creates snapshot in hrm_platform_organization_snapshots
   * 8. Return updated organization record
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":organizationId")
  public async update(
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmPlatformOrganization.IUpdate,
  ): Promise<IHrmPlatformOrganization> {
    try {
      return await putHrmPlatformOrganizationsOrganizationId({
        organizationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes an organization and all its associated data.
   *
   * Validates that all pending timesheets are resolved and no active employee contracts exist. Cascades deletion to employees, projects, tasks, timelogs, timesheets, departments, roles, timers, and activity logs. The organization owner's user account is retained but detached from the organization context.
   *
   * @param connection
   * @param organizationId Unique identifier of the organization to be permanently deleted.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor null
     * @x-autobe-specification Query hrm_platform_organizations by
     *   {organizationId}. Validate that no hrm_platform_timesheets with status
     *   'draft' or 'submitted' exist within this organization. Validate that no
     *   hrm_platform_employee_contracts with end_date NULL (active contracts)
     *   exist for any employee belonging to this organization. If validations
     *   pass, set deleted_at to current timestamp on the organization record to
     *   trigger soft-deletion cascade. Cascade deletion removes all associated
     *   entities: employees, projects, tasks, timelogs, timesheets,
     *   departments, roles, timers, and activity log entries. The owner's user
     *   account remains active in the platform but is no longer associated with
     *   the deleted organization context. Return 200 OK with null body upon
     *   successful deletion.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":organizationId")
  public async erase(
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmPlatformOrganizationsOrganizationId({
        organizationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
