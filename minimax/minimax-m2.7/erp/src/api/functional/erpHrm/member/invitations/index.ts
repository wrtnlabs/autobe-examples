import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmInvitation } from "../../../../structures/IErpHrmInvitation";
import { IPageIErpHrmInvitation } from "../../../../structures/IPageIErpHrmInvitation";

/**
 * Create an invitation to invite a prospective employee to join the organization.
 *
 * This endpoint allows users with `employee:manage` permission to send invitations to potential employees. The invitation is scoped to the currently selected organization context. When an invitation is sent to an existing user, an employee record is created immediately linking that user to the organization. When sent to a new user without an existing account, a pending invitation record is created that will be automatically accepted when the user registers with the invited email address.
 *
 * The invitation captures the email address of the person being invited, the organization reference from the current context, the invitation status (initially pending), and the timestamp of invitation creation. Optional pre-assignments include a role, department, and position that will be applied to the employee record upon acceptance.
 *
 * The system prevents duplicate invitations for the same email address within the same organization. If a pending invitation already exists for the email and organization combination, the request is rejected. Accepted invitations cannot be duplicated either.
 *
 * Security: Only authenticated users with `employee:manage` permission can create invitations. The invitation is tied to the user's current organization context and cannot be created for other organizations.
 *
 * @param props.connection
 * @param props.body Invitation creation payload containing the email address to invite and optional pre-assignments
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement the invitation creation workflow for the erp_hrm_invitations table.
 *
 * 1. Authentication and Authorization:
 *    - Verify the requesting user is authenticated (has valid session)
 *    - Verify the user has `employee:manage` permission in the current organization context
 *    - Extract the organization ID from the current session context
 *
 * 2. Input Validation:
 *    - Validate email format is properly formatted (RFC 5322 compliant)
 *    - Validate email is not empty and does not exceed reasonable length (e.g., 255 characters)
 *    - If erpHrmRoleId is provided, verify the role exists and belongs to the current organization
 *    - If erpHrmDepartmentId is provided, verify the department exists and belongs to the current organization
 *    - Validate position length if provided (e.g., max 100 characters)
 *    - Validate note length if provided (e.g., max 500 characters)
 *
 * 3. Duplicate Check:
 *    - Query the database for existing invitation with the same erp_hrm_organization_id and email
 *    - Check for invitations with status 'pending' or 'accepted' (expired can be replaced)
 *    - If duplicate found with pending/accepted status, return error 409 Conflict
 *
 * 4. Invitation Creation:
 *    - Generate a secure random token for the invitation link
 *    - Create the invitation record with:
 *      - id: UUID generated server-side
 *      - erp_hrm_organization_id: from session context
 *      - erp_hrm_role_id: provided or null (will default to Employee role)
 *      - erp_hrm_department_id: provided or null
 *      - email: normalized (lowercase, trimmed)
 *      - status: 'pending'
 *      - token: generated secure token
 *      - position: provided or null
 *      - note: provided or null
 *      - accepted_at: null
 *      - expires_at: null or calculated (e.g., 7 days from now if expiration policy exists)
 *      - created_at: current timestamp
 *      - updated_at: current timestamp
 *      - deleted_at: null
 *
 * 5. Existing User Handling (within same transaction):
 *    - Check if a member with the given email exists in erp_hrm_members
 *    - If existing user found:
 *      - Create an employee record in erp_hrm_employees immediately
 *      - Use the invited role (or default Employee role if not specified)
 *      - Use the invited department if specified
 *      - Set the employee's status to 'active'
 *      - Update invitation status to 'accepted'
 *      - Set accepted_at to current timestamp
 *      - Return the invitation with employee creation confirmation
 *
 * 6. New User Handling:
 *    - No existing user found
 *    - Invitation remains with status 'pending'
 *    - Return the created pending invitation
 *
 * 7. Activity Logging:
 *    - Log the invitation creation in erp_hrm_activity_logs
 *    - Include: action 'invitation.create', target user email, inviter info
 *
 * 8. Response:
 *    - Return HTTP 201 Created with the created invitation entity
 *    - Include a flag or field indicating whether an employee was immediately created
 *    - For pending invitations, include the token for invitation link generation
 * @path /erpHrm/member/invitations
 * @accessor api.functional.erpHrm.member.invitations.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Invitation creation payload containing the email address to invite and optional pre-assignments
     */
    body: IErpHrmInvitation.ICreate;
  };
  export type Body = IErpHrmInvitation.ICreate;
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "POST",
    path: "/erpHrm/member/invitations",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrm/member/invitations";
  export const random = (): IErpHrmInvitation =>
    typia.random<IErpHrmInvitation>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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

/**
 * Retrieve a filtered and paginated list of invitations sent from the organization.
 *
 * This operation returns all invitations associated with the currently selected organization context, allowing users with appropriate permissions to browse, search, and filter through historical and pending invitations. The response is paginated to handle large result sets efficiently.
 *
 * The invitation entity stores email addresses of invited persons, their invitation status (pending, accepted, or expired), timestamps for creation and acceptance, and optional pre-assigned role and department information for streamlined onboarding.
 *
 * **Filtering Capabilities:**
 * - Filter by invitation status: pending, accepted, or expired
 * - Search by email address (partial matching supported)
 * - Sort by creation date or other sortable fields
 *
 * **Pagination:**
 * - Configurable page size with default limits
 * - Cursor or offset-based pagination for efficient traversal
 * - Total count information for UI display
 *
 * **Security:**
 * - Requires authenticated session with valid organization context
 * - Users must have employee:manage permission to view invitations
 * - Invitations are isolated per organization - users cannot access invitations from other organizations
 * - Soft-deleted invitations are excluded from results
 *
 * **Relationship to Database:**
 * - Queries erp_hrm_invitations table with erp_hrm_organization_id from session
 * - Joins with erp_hrm_roles for role name in summary (if requested)
 * - Joins with erp_hrm_departments for department name in summary (if requested)
 * - Results filtered by status and email search criteria
 * - Ordered by created_at descending by default
 *
 * @param props.connection
 * @param props.body Search criteria and pagination parameters for filtering invitations
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query erp_hrm_invitations table filtered by erp_hrm_organization_id from session context.
 *
 * 1. Extract organization_id from authenticated user's session
 * 2. Build query: SELECT * FROM erp_hrm_invitations WHERE erp_hrm_organization_id = :orgId AND deleted_at IS NULL
 * 3. Apply filters from request body:
 *    - If status is provided, add: AND status = :status
 *    - If email is provided (search), add: AND email ILIKE '%' || :email || '%'
 * 4. Apply pagination:
 *    - OFFSET :page * :limit for offset pagination
 *    - Or cursor-based using id/created_at for large datasets
 * 5. Include total_count for pagination UI
 * 6. If includeRelations is true, JOIN with erp_hrm_roles and erp_hrm_departments
 * 7. Return IPageIErpHrmInvitation.ISummary with items array and pagination metadata
 *
 * Edge cases:
 * - Invalid status value: return 400 with validation error
 * - Page out of range: return empty items array with pagination metadata
 * - No invitations found: return empty items array, not 404
 * @path /erpHrm/member/invitations
 * @accessor api.functional.erpHrm.member.invitations.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria and pagination parameters for filtering invitations
     */
    body: IErpHrmInvitation.IRequest;
  };
  export type Body = IErpHrmInvitation.IRequest;
  export type Response = IPageIErpHrmInvitation.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrm/member/invitations",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/erpHrm/member/invitations";
  export const random = (): IPageIErpHrmInvitation.ISummary =>
    typia.random<IPageIErpHrmInvitation.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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

/**
 * Retrieve a single invitation by its unique identifier.
 *
 * This endpoint retrieves detailed information about a specific invitation within the authenticated user's organization context. The invitation must belong to the currently selected organization; invitations from other organizations are not accessible.
 *
 * The returned invitation object includes the invited email address, current status (pending, accepted, or expired), the timestamp when it was created, and optional fields such as the pre-assigned role, department, position, and a note from the organization. If the invitation has been accepted, the accepted_at timestamp is included.
 *
 * Security and Access Control:
 * - Only authenticated members with appropriate permissions can retrieve invitation details
 * - The invitation must belong to the currently selected organization context
 * - Users with `employee:manage` permission can view all invitations in their organization
 * - Invitations that have been soft-deleted (deleted_at is not null) are not returned
 *
 * Related Database Entities:
 * - The invitation references erp_hrm_organizations for the owning organization
 * - Optionally references erp_hrm_roles for pre-assigned role
 * - Optionally references erp_hrm_departments for pre-assigned department
 *
 * Expected Response:
 * - 200 OK with full invitation details
 * - 404 Not Found if invitation does not exist or does not belong to the current organization
 *
 * @param props.connection
 * @param props.invitationId Unique identifier of the invitation to retrieve
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Query the erp_hrm_invitations table by invitation ID.
 *
 * 1. Extract invitationId from path parameters (must be valid UUID format)
 * 2. Validate that the invitation exists and belongs to the authenticated user's current organization context
 * 3. Ensure the invitation has not been soft-deleted (deleted_at must be null)
 * 4. Join with erp_hrm_organizations to verify organization ownership
 * 5. Optionally join with erp_hrm_roles and erp_hrm_departments to include pre-assigned values in response
 * 6. Return 404 error if invitation is not found or belongs to a different organization
 * 7. Return the full invitation record including all fields: id, erp_hrm_organization_id, erp_hrm_role_id, erp_hrm_department_id, email, status, token, position, note, accepted_at, expires_at, created_at, updated_at
 * @path /erpHrm/member/invitations/:invitationId
 * @accessor api.functional.erpHrm.member.invitations.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the invitation to retrieve
     */
    invitationId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "GET",
    path: "/erpHrm/member/invitations/:invitationId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/invitations/${encodeURIComponent(props.invitationId ?? "null")}`;
  export const random = (): IErpHrmInvitation =>
    typia.random<IErpHrmInvitation>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("invitationId")(() => typia.assert(props.invitationId));
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

/**
 * Update an existing invitation within the current organization context.
 *
 * This operation allows users with `employee:manage` permission to modify invitation properties before the invitee accepts. The invitation must be in 'pending' status to be updated - accepted or expired invitations cannot be modified through this endpoint.
 *
 * The operation supports updating pre-assigned role and department for streamlined onboarding, modifying the invitation note or position, and extending the expiration date (effectively resending the invitation). When the expiration date is updated, the invitation link remains valid with the new timeframe.
 *
 * The invitation is scoped to the currently selected organization in the session context. All updates are validated against the organization ownership - invitations cannot be transferred between organizations.
 *
 * **Security**: Requires `employee:manage` permission. Only invitations belonging to the current organization can be updated.
 *
 * **Validation Rules**:
 * - Invitation must exist and not be soft-deleted
 * - Invitation must be in 'pending' status
 * - Invitation must belong to the current organization context
 * - Role assignment (if provided) must reference an existing role within the organization
 * - Department assignment (if provided) must reference an existing department within the organization
 * - Email format validation applies if email is modified
 *
 * **Status Transition**: The status remains 'pending' after update unless explicitly transitioned through cancellation flow (handled separately).
 *
 * @param props.connection
 * @param props.invitationId Unique identifier of the invitation to update
 * @param props.body Fields to update on the invitation. All fields are optional. Only provided fields will be updated.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement the invitation update operation following these steps:
 *
 * 1. **Authentication & Authorization**
 *    - Verify the request includes valid member session authentication
 *    - Verify the member has `employee:manage` permission in the current organization context
 *
 * 2. **Input Validation**
 *    - Validate `invitationId` is a valid UUID format
 *    - Validate email format if included in request body
 *
 * 3. **Invitation Lookup**
 *    - Query `erp_hrm_invitations` table by `id` = invitationId
 *    - Verify `deleted_at` IS NULL (not soft-deleted)
 *    - Verify `erp_hrm_organization_id` matches the current organization context
 *    - Verify `status` = 'pending'
 *    - Return 404 error if invitation not found or doesn't match criteria
 *
 * 4. **Related Entity Validation**
 *    - If `erp_hrm_role_id` is provided, verify the role exists in `erp_hrm_roles` table and belongs to the current organization
 *    - If `erp_hrm_department_id` is provided, verify the department exists in `erp_hrm_departments` table and belongs to the current organization
 *
 * 5. **Update Processing**
 *    - Update the invitation record with provided fields:
 *      - `erp_hrm_role_id` (if provided)
 *      - `erp_hrm_department_id` (if provided)
 *      - `position` (if provided)
 *      - `note` (if provided)
 *      - `expires_at` (if provided, extending expiration)
 *    - Set `updated_at` to current timestamp
 *
 * 6. **Response Generation**
 *    - Fetch the complete updated invitation record with organization, role, and department relations
 *    - Return the updated invitation resource
 *
 * **Error Handling**:
 * - 400 Bad Request: Invalid UUID format, invalid email format
 * - 401 Unauthorized: Missing or invalid session
 * - 403 Forbidden: Missing `employee:manage` permission
 * - 404 Not Found: Invitation not found, soft-deleted, or belongs to different organization
 * - 409 Conflict: Invitation is not in 'pending' status (already accepted or expired)
 * - 422 Unprocessable Entity: Referenced role or department doesn't exist or belongs to different organization
 * @path /erpHrm/member/invitations/:invitationId
 * @accessor api.functional.erpHrm.member.invitations.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique identifier of the invitation to update
     */
    invitationId: string & tags.Format<"uuid">;

    /**
     * Fields to update on the invitation. All fields are optional. Only provided fields will be updated.
     */
    body: IErpHrmInvitation.IUpdate;
  };
  export type Body = IErpHrmInvitation.IUpdate;
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrm/member/invitations/:invitationId",
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
    `/erpHrm/member/invitations/${encodeURIComponent(props.invitationId ?? "null")}`;
  export const random = (): IErpHrmInvitation =>
    typia.random<IErpHrmInvitation>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("invitationId")(() => typia.assert(props.invitationId));
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

/**
 * Cancel and permanently remove a pending invitation from the organization.
 *
 * This endpoint allows users with employee:manage permission to cancel pending invitations. When an invitation is cancelled, it is permanently removed from the erp_hrm_invitations table, preventing the invited user from being automatically added to the organization upon registration.
 *
 * Only pending invitations can be cancelled. Accepted invitations cannot be cancelled through this operation; instead, the employee must be deactivated. Expired invitations also cannot be cancelled as they are no longer valid.
 *
 * The invitation must belong to the currently selected organization context. All invitation operations are scoped to the selected organization and cannot affect invitations in other organizations.
 *
 * Cancellation is final and irreversible. The cancelled invitation record is permanently removed from the database.
 *
 * Related operations:
 * - POST /invitations: Create a new invitation
 * - PATCH /invitations: List/search invitations with filters
 * - GET /invitations/{invitationId}: Retrieve invitation details
 *
 * @param props.connection
 * @param props.invitationId Unique identifier of the invitation to cancel
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Service Layer:
 * 1. Validate the invitationId is a valid UUID format
 * 2. Retrieve the invitation from erp_hrm_invitations table by invitationId
 * 3. Verify the invitation belongs to the current organization context (erp_hrm_organization_id matches session organization)
 * 4. Verify the invitation status is "pending" - reject with 400 if status is "accepted" or "expired"
 * 5. Delete the invitation record from erp_hrm_invitations table
 * 6. Return 204 No Content on successful deletion
 *
 * Error Handling:
 * - 400 Bad Request: Invitation is not in pending status
 * - 403 Forbidden: User lacks employee:manage permission
 * - 404 Not Found: Invitation does not exist or belongs to different organization
 *
 * Transaction: Single DELETE operation, no transaction needed
 *
 * Validation Rules:
 * - Only invitations with status = "pending" can be cancelled
 * - Invitation must be scoped to the current organization
 * @path /erpHrm/member/invitations/:invitationId
 * @accessor api.functional.erpHrm.member.invitations.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique identifier of the invitation to cancel
     */
    invitationId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/erpHrm/member/invitations/:invitationId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/invitations/${encodeURIComponent(props.invitationId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("invitationId")(() => typia.assert(props.invitationId));
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

/**
 * Revoke a pending employee invitation before acceptance.
 *
 * This endpoint performs a soft delete on a pending invitation, marking it as deleted in the database while preserving the record for historical purposes. Once revoked, the invited user cannot be automatically added to the organization even if they later register with the invited email address. The revocation is immediate.
 *
 * Only invitations with 'pending' status can be revoked. Accepted or expired invitations cannot be revoked through this operation - accepted invitations require employee deactivation instead.
 *
 * The authenticated user must have the employee:manage permission within the current organization context. The invitation must belong to the same organization as the user's current session.
 *
 * The revoked invitation remains in the database with its deleted_at timestamp set, allowing it to be included in historical reports if needed.
 *
 * @param props.connection
 * @param props.invitationId Unique identifier of the invitation to revoke
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement the revoke invitation action following these steps:
 *
 * 1. Validate the authenticated user has employee:manage permission in the current organization context
 * 2. Retrieve the invitation by invitationId from erp_hrm_invitations table
 * 3. Verify the invitation belongs to the current organization (erp_hrm_organization_id matches session organization)
 * 4. Verify the invitation status is 'pending' - reject with 400 error if status is not pending
 * 5. Verify the invitation has not been soft-deleted (deleted_at is null)
 * 6. Update the invitation:
 *    - Set deleted_at to current timestamp (soft delete)
 *    - Optionally update status to 'revoked' if status field supports this value
 * 7. Create activity log entry recording the revocation event with:
 *    - User ID of the actor who revoked
 *    - Invitation ID
 *    - Invited email address
 *    - Timestamp
 * 8. Return the revoked invitation entity in the response
 *
 * Edge cases:
 * - If invitation does not exist: Return 404 error
 * - If invitation belongs to different organization: Return 403 error
 * - If invitation is not pending: Return 400 error with message indicating current status
 * - If invitation already revoked/soft-deleted: Return 400 error
 * @path /erpHrm/member/invitations/:invitationId/revoke
 * @accessor api.functional.erpHrm.member.invitations.revoke
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function revoke(
  connection: IConnection,
  props: revoke.Props,
): Promise<revoke.Response> {
  return true === connection.simulate
    ? revoke.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...revoke.METADATA,
          path: revoke.path(props),
          status: null,
        },
      );
}
export namespace revoke {
  export type Props = {
    /**
     * Unique identifier of the invitation to revoke
     */
    invitationId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "POST",
    path: "/erpHrm/member/invitations/:invitationId/revoke",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/invitations/${encodeURIComponent(props.invitationId ?? "null")}/revoke`;
  export const random = (): IErpHrmInvitation =>
    typia.random<IErpHrmInvitation>();
  export const simulate = (
    connection: IConnection,
    props: revoke.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: revoke.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("invitationId")(() => typia.assert(props.invitationId));
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
