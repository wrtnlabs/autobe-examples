import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IErpHrmInvitation } from "../../../../../structures/IErpHrmInvitation";
import { IPageIErpHrmInvitation } from "../../../../../structures/IPageIErpHrmInvitation";

/**
 * Issue a new invitation to bring a prospective employee into an organization.
 *
 * This operation creates a new invitation record in the `erp_hrm_invitations` table, directed at a specific email address and scoped to the organization identified by `organizationId`. The invitation captures the intent to onboard a specific individual as a new organization member, holding that intent in an open state until the person completes registration. The invitation record stores only the target email address, the organization scope, the issuing member's identity, and the current status — it does not carry role assignment or employment classification details, as those are established separately once the employee record is fully created.
 *
 * This operation is accessible only to authenticated organization members who hold the `employee:manage` permission within the target organization (typically the Owner or Manager built-in roles, or any custom role with this permission code). The identity of the inviting member is resolved automatically from the authenticated session and stored as the `erp_hrm_organization_member_id` on the invitation record, providing full traceability of who initiated each onboarding request.
 *
 * Upon creation, the invitation is placed in the `pending` status. Two distinct fulfillment paths exist depending on whether the invited email already corresponds to a registered platform account:
 *
 * - **Pending flow (no existing account):** The invitation remains in `pending` state. When a new user later registers using that email address, the system automatically transitions all matching pending invitations to `accepted` status and adds the new user to each corresponding organization as an `erp_hrm_organization_members` record. No additional manual step is required from either party.
 * - **Direct-add flow (existing account):** If the invited email is already associated with an active `erp_hrm_members` record, the system immediately creates the `erp_hrm_organization_members` record, links the member to the invitation, and transitions the invitation status to `accepted` in a single atomic operation.
 *
 * The same email address cannot have two simultaneous `pending` invitations for the same organization. If a pending invitation already exists for this email in this organization, or if the invited email already belongs to an active member of the organization, the request will be rejected to prevent duplicate onboarding records.
 *
 * This operation feeds directly into the invitation pipeline that can be monitored in real time by members with `employee:manage` permission. Newly issued invitations appear immediately in the pipeline view upon creation. Each invitation record also contributes an entry to the organization's activity log, noting the issuing member and target email address for audit and oversight purposes.
 *
 * Related operations:
 * - `PATCH /erpHrm/member/organizations/{organizationId}/invitations` — list and filter all invitations for the organization.
 * - `GET /erpHrm/member/organizations/{organizationId}/invitations/{invitationId}` — retrieve a specific invitation record.
 *
 * @param props.connection
 * @param props.organizationId The UUID of the target organization into which the prospective employee is being invited.
 * @param props.body Invitation details specifying the invitee's email address.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Authenticate the requesting member and resolve
 *   their `erp_hrm_organization_members` record for the given `organizationId`.
 *   Reject with 403 if the member does not hold `employee:manage` permission in
 *   this organization.
 *
 * 2. Validate `organizationId`: confirm the organization exists in `erp_hrm_organizations` and is not soft-deleted (`deleted_at IS NULL`). Reject with 404 if not found.
 *
 * 3. Validate the request body:
 *    a. `email` must be a valid email format.
 *    b. `roleId` must reference an existing `erp_hrm_roles` record with `erp_hrm_organization_id = organizationId`. Reject with 422 if not found.
 *    c. `employmentType` must be one of: 'full-time', 'part-time', 'contractor', 'intern'.
 *
 * 4. Check for duplicate pending invitation: query `erp_hrm_invitations` WHERE `erp_hrm_organization_id = organizationId AND email = :email AND status = 'pending'`. If any record exists, reject with 409 (conflict).
 *
 * 5. Check if the email matches an existing active member: query `erp_hrm_members` WHERE `email = :email AND deleted_at IS NULL`.
 *
 *    - **If no existing member (pending flow):**
 *      - Insert a new `erp_hrm_invitations` record with:
 *        - `id`: new UUID
 *        - `erp_hrm_organization_id`: organizationId
 *        - `erp_hrm_organization_member_id`: authenticated member's org member id
 *        - `erp_hrm_member_id`: NULL
 *        - `email`: provided email
 *        - `status`: 'pending'
 *        - `created_at`, `updated_at`: current timestamp
 *      - Return the created invitation record.
 *
 *    - **If existing member (direct-add flow):**
 *      - Verify the member is not already an `erp_hrm_organization_members` in this organization (check `@@unique([organization_id, member_id])`). If already a member, reject with 409.
 *      - Within a transaction:
 *        a. Insert `erp_hrm_invitations` with `erp_hrm_member_id` = found member id, `status = 'accepted'`.
 *        b. Insert `erp_hrm_organization_members` with the specified `role_id`, `employment_type`, `status = 'active'`, linking to the found member.
 *      - Return the created invitation record (status: 'accepted').
 *
 * 6. Emit real-time events for invitation pipeline monitoring as appropriate (invitation created or invitation accepted).
 * @path /erpHrm/member/organizations/:organizationId/invitations
 * @accessor api.functional.erpHrm.member.organizations.invitations.create
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
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * The UUID of the target organization into which the prospective employee is being invited.
     */
    organizationId: string & tags.Format<"uuid">;

    /**
     * Invitation details specifying the invitee's email address.
     */
    body: IErpHrmInvitation.ICreate;
  };
  export type Body = IErpHrmInvitation.ICreate;
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "POST",
    path: "/erpHrm/member/organizations/:organizationId/invitations",
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
    `/erpHrm/member/organizations/${encodeURIComponent(props.organizationId ?? "null")}/invitations`;
  export const random = (): IErpHrmInvitation =>
    typia.random<IErpHrmInvitation>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("organizationId")(() => typia.assert(props.organizationId));
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
 * Retrieve a paginated and filtered list of invitations for a specific organization.
 *
 * This operation provides authorized organization members with the ability to browse, search, and monitor the full invitation pipeline for their organization. Each invitation record in `erp_hrm_invitations` is scoped to exactly one organization via `erp_hrm_organization_id`, and this endpoint returns all invitations matching the given search criteria within the organization identified by `organizationId`.
 *
 * Invitations in the system represent pending onboarding records. Each invitation targets a specific email address and progresses through a status lifecycle: `pending` (awaiting the invitee's registration), `accepted` (the invitee has registered and been linked to the organization), `rejected`, `expired`, or `cancelled`. This endpoint returns invitations at any stage of that lifecycle, enabling managers to monitor both outstanding and completed onboarding activities.
 *
 * The caller must be an authenticated member of the organization and must hold the `employee:manage` permission (or equivalent, such as the Owner or Manager built-in roles). Members without this permission are not authorized to view the invitation list.
 *
 * Filtering options include invitation status (e.g., pending only, accepted only, or all), target email address (partial/trigram match), date range on `created_at`, and the inviting member. Pagination is cursor-based or offset-based with configurable page size. The response includes each invitation's status, email, issuing member reference, linked member reference (if accepted), and timestamps.
 *
 * This endpoint is the primary tool for real-time invitation pipeline monitoring. When paired with real-time event subscriptions, managers can observe newly issued invitations appear immediately, watch pending invitations transition to accepted status, and see new hires appear in the member list the moment they join — without requiring a manual refresh.
 *
 * Related operations:
 * - `POST /organizations/{organizationId}/invitations` — Issue a new invitation to an email address.
 * - `GET /organizations/{organizationId}/invitations/{invitationId}` — Retrieve the full detail of a single invitation record.
 * - `PATCH /organizations/{organizationId}/members` — List organization members who have already joined.
 *
 * @param props.connection
 * @param props.organizationId The UUID of the organization whose invitations are being queried (global scope).
 * @param props.body Search criteria and pagination options for filtering the organization's invitation list.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate that the authenticated session belongs to
 *   a member of the organization identified by `organizationId`. If the
 *   organization does not exist or is soft-deleted
 *   (`erp_hrm_organizations.deleted_at IS NOT NULL`), return 404.
 *
 * 2. Verify that the caller's `erp_hrm_organization_members` record for this organization has the `employee:manage` permission (either via a built-in Owner/Manager role or a custom role that includes this permission code). Return 403 if unauthorized.
 *
 * 3. Parse the request body `IErpHrmInvitation.IRequest` for search/filter/pagination parameters:
 *    - `status` (optional): filter by one or more invitation statuses (e.g., 'pending', 'accepted', 'rejected', 'expired', 'cancelled')
 *    - `email` (optional): partial email match using the GIN trigram index on `erp_hrm_invitations.email`
 *    - `invitingMemberId` (optional): filter by `erp_hrm_organization_member_id`
 *    - `createdAtFrom` / `createdAtTo` (optional): date range filter on `created_at`
 *    - `page` / `limit` (optional): pagination controls (offset-based)
 *    - `sort` (optional): sort by `created_at` ascending or descending
 *
 * 4. Query `erp_hrm_invitations` WHERE `erp_hrm_organization_id = organizationId` and all applicable filters. Use the composite index on `(erp_hrm_organization_id, status, created_at)` for efficient filtering.
 *
 * 5. Join with `erp_hrm_organization_members` (inviting member) and optionally with `erp_hrm_members` (linked member account) to populate summary fields.
 *
 * 6. Return the results wrapped in `IPageIErpHrmInvitation.ISummary` with pagination metadata (total count, current page, page size, total pages).
 *
 * Edge cases:
 * - If no invitations match the filter, return an empty data array with pagination metadata reflecting 0 total.
 * - If `organizationId` exists but the caller is not a member of that organization, return 403.
 * - Ensure soft-deleted organization members are still included in invitation records for historical accuracy (inviting member may be deactivated).
 * @path /erpHrm/member/organizations/:organizationId/invitations
 * @accessor api.functional.erpHrm.member.organizations.invitations.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * The UUID of the organization whose invitations are being queried (global scope).
     */
    organizationId: string & tags.Format<"uuid">;

    /**
     * Search criteria and pagination options for filtering the organization's invitation list.
     */
    body: IErpHrmInvitation.IRequest;
  };
  export type Body = IErpHrmInvitation.IRequest;
  export type Response = IPageIErpHrmInvitation.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrm/member/organizations/:organizationId/invitations",
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
    `/erpHrm/member/organizations/${encodeURIComponent(props.organizationId ?? "null")}/invitations`;
  export const random = (): IPageIErpHrmInvitation.ISummary =>
    typia.random<IPageIErpHrmInvitation.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("organizationId")(() => typia.assert(props.organizationId));
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
 * Retrieve the detailed information of a specific invitation record within an organization.
 *
 * This operation returns the full details of a single invitation (`erp_hrm_invitations`) identified by its UUID, scoped to the specified organization. The invitation record captures the intent to onboard a prospective employee: it records the email address of the invitee, the current lifecycle status of the invitation, the organization member who issued it, and — once the invitee has registered — the linked platform-level member account.
 *
 * The invitation status follows a defined lifecycle: `pending` (issued and awaiting registration), `accepted` (the invitee has registered and been automatically linked to the organization), `rejected` (the invitation was declined), `expired` (the invitation exceeded its validity period), or `cancelled` (the invitation was revoked by the issuing member or an administrator). The `erp_hrm_member_id` field on the invitation is null while the status is pending and is populated when the invitee's account is matched upon sign-up.
 *
 * Only members with the `employee:manage` permission within the target organization are permitted to view invitation records. The organization is identified by the `organizationId` path parameter, and data isolation is strictly enforced — an invitation from one organization cannot be retrieved using another organization's ID.
 *
 * This operation is typically used after performing a list search via `PATCH /organizations/{organizationId}/invitations` to obtain the invitation identifier, and then calling this endpoint to retrieve the full detail view of the selected record. It may also be used directly when the invitation ID is already known, for example when reacting to a real-time invitation event.
 *
 * @param props.connection
 * @param props.organizationId The UUID of the organization to which the invitation belongs.
 * @param props.invitationId The UUID of the invitation record to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate that the authenticated member belongs to
 *   the organization identified by `organizationId` and holds the
 *   `employee:manage` permission. 2. Query the `erp_hrm_invitations` table for
 *   a record where `id = invitationId` AND `erp_hrm_organization_id =
 *   organizationId`. 3. If no such record exists (either the invitation does
 *   not exist or does not belong to the given organization), return a 404 Not
 *   Found error. 4. Join the inviting member (`erp_hrm_organization_members`
 *   via `erp_hrm_organization_member_id`) to include issuer details in the
 *   response. 5. If `erp_hrm_member_id` is non-null (invitation accepted),
 *   optionally join `erp_hrm_members` to include linked member identity. 6.
 *   Return the full invitation detail object including: id, email, status,
 *   erp_hrm_organization_id, erp_hrm_organization_member_id (issuer),
 *   erp_hrm_member_id (nullable, linked member), created_at, updated_at. 7. No
 *   pagination or filtering is needed — this is a single-record retrieval by
 *   primary key.
 * @path /erpHrm/member/organizations/:organizationId/invitations/:invitationId
 * @accessor api.functional.erpHrm.member.organizations.invitations.at
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
     * The UUID of the organization to which the invitation belongs.
     */
    organizationId: string & tags.Format<"uuid">;

    /**
     * The UUID of the invitation record to retrieve.
     */
    invitationId: string & tags.Format<"uuid">;
  };
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "GET",
    path: "/erpHrm/member/organizations/:organizationId/invitations/:invitationId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/erpHrm/member/organizations/${encodeURIComponent(props.organizationId ?? "null")}/invitations/${encodeURIComponent(props.invitationId ?? "null")}`;
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
      assert.param("organizationId")(() => typia.assert(props.organizationId));
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
 * Update an existing invitation record within a specific organization.
 *
 * This operation allows authorized organization members — typically those holding the Owner or Manager role — to modify an outstanding invitation. The primary use case is transitioning the status of a pending invitation, such as cancelling it before the invitee has registered, or marking it as rejected or expired.
 *
 * The invitation is identified by its UUID (`invitationId`) and must belong to the organization specified by `organizationId`. If the invitation does not belong to the given organization, the request is rejected with a not-found error.
 *
 * The `erp_hrm_invitations` table stores the current status of each invitation along with the organization it belongs to, the member who issued it, the target email address, and timestamps for creation and last update. The `status` field controls the invitation lifecycle: `pending` (issued, awaiting registration), `accepted` (invitee has registered and been linked), `rejected` (invitation was declined), `expired` (invitation exceeded its validity period), or `cancelled` (invitation was revoked by the issuing member or an administrator).
 *
 * Only transitions that are semantically valid from the current status are permitted. For example, a `pending` invitation may be `cancelled` or `rejected`, but an `accepted` invitation cannot be transitioned back to `pending`. The service layer is responsible for enforcing these transition rules.
 *
 * Note that the auto-acceptance flow — where a new user registering with the invited email automatically transitions the invitation to `accepted` — is handled internally by the sign-up process and is not the intended use of this endpoint. This endpoint is for manual administrative updates by authorized organization members.
 *
 * Related operations:
 * - `POST /organizations/{organizationId}/invitations` should be used to create a new invitation.
 * - `PATCH /organizations/{organizationId}/invitations` should be used to list and search invitations.
 * - `GET /organizations/{organizationId}/invitations/{invitationId}` should be used to retrieve the current state of a specific invitation.
 *
 * @param props.connection
 * @param props.organizationId The UUID of the organization that owns this invitation (global scope).
 * @param props.invitationId The UUID of the invitation record to update (scoped to the organization).
 * @param props.body Updated information for the invitation, such as a status transition (e.g., cancelling a pending invitation).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1. Validate that the authenticated member belongs to
 *   the organization identified by `organizationId` and holds a role with
 *   permission to manage invitations (Owner or Manager level). 2. Fetch the
 *   invitation record from `erp_hrm_invitations` by `id = invitationId` AND
 *   `erp_hrm_organization_id = organizationId`. Return 404 if not found or if
 *   the invitation belongs to a different organization. 3. Validate the
 *   requested status transition from the current `status` to the new `status`
 *   supplied in the request body. Permitted transitions: - `pending` →
 *   `cancelled` (admin revocation) - `pending` → `rejected` (declined by
 *   invitee or admin) - `pending` → `expired` (admin explicitly marks expired)
 *   - All other transitions should be rejected with a 422 Unprocessable Entity
 *   error explaining the invalid transition. 4. Apply the update: set `status`
 *   to the new value and update `updated_at` to the current timestamp. 5.
 *   Return the full updated `erp_hrm_invitations` record as the response body
 *   mapped to `IErpHrmInvitation`. 6. Edge cases: - If the invitation is
 *   already in a terminal state (`accepted`, `cancelled`, `rejected`,
 *   `expired`), reject the update request with an appropriate error. - If the
 *   organization itself is soft-deleted (`deleted_at` is not null in
 *   `erp_hrm_organizations`), reject the request. - Ensure transactional
 *   integrity so concurrent updates do not produce inconsistent states.
 * @path /erpHrm/member/organizations/:organizationId/invitations/:invitationId
 * @accessor api.functional.erpHrm.member.organizations.invitations.update
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
     * The UUID of the organization that owns this invitation (global scope).
     */
    organizationId: string & tags.Format<"uuid">;

    /**
     * The UUID of the invitation record to update (scoped to the organization).
     */
    invitationId: string & tags.Format<"uuid">;

    /**
     * Updated information for the invitation, such as a status transition (e.g., cancelling a pending invitation).
     */
    body: IErpHrmInvitation.IUpdate;
  };
  export type Body = IErpHrmInvitation.IUpdate;
  export type Response = IErpHrmInvitation;

  export const METADATA = {
    method: "PUT",
    path: "/erpHrm/member/organizations/:organizationId/invitations/:invitationId",
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
    `/erpHrm/member/organizations/${encodeURIComponent(props.organizationId ?? "null")}/invitations/${encodeURIComponent(props.invitationId ?? "null")}`;
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
      assert.param("organizationId")(() => typia.assert(props.organizationId));
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
