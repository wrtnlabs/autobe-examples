import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOrganizationInvitation } from "../../../../../api/structures/IHrmTimeTrackingOrganizationInvitation";
import { IPageIHrmTimeTrackingOrganizationInvitation } from "../../../../../api/structures/IPageIHrmTimeTrackingOrganizationInvitation";
import { OwnerAuth } from "../../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../../decorators/payload/OwnerPayload";
import { deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId } from "../../../../../providers/deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId";
import { getHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId } from "../../../../../providers/getHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId";
import { patchHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations } from "../../../../../providers/patchHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations";
import { postHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations } from "../../../../../providers/postHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations";
import { putHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId } from "../../../../../providers/putHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId";

@Controller("/hrmTimeTracking/owner/organizations/:organizationId/invitations")
export class HrmtimetrackingOwnerOrganizationsInvitationsController {
  /**
   * Create a new organization invitation for a specific organization and invited email address.
   *
   * This operation starts the organization membership onboarding flow by creating an organization-scoped invitation record within the target tenant workspace. The invitation belongs to exactly one organization, references the invited email address used for account matching, and may optionally preselect the organization role that should be assigned when the invitation is accepted. In database terms, the operation creates a record in `hrm_time_tracking_organization_invitations`, which stores the parent `hrm_time_tracking_organization_id`, the optional `hrm_time_tracking_role_id`, the invitee `email`, the invitation `status`, the optional `message`, and lifecycle timestamps such as `invited_at`, `created_at`, and `updated_at`.
   *
   * This endpoint must be available only to authorized users acting within the current organization context, because invitation creation directly affects workforce onboarding for an independently operated organization tenant. The organization itself is the primary business boundary in this service, and all invitation records are isolated to that organization. Owners are the highest-authority role in the built-in hierarchy, and managers may also be allowed when their organization permissions include invitation and membership administration. Ordinary employees should not use this operation to onboard other people into the organization.
   *
   * The operation is tightly connected to later invitation review and onboarding monitoring. After creation, the resulting invitation should appear in organization invitation review so that authorized users can distinguish unresolved pending invitations from invitations that were already resolved into membership. When the invited email does not yet belong to an existing user account, the system preserves the pending invitation as an unresolved onboarding item. When a future sign-up uses the same email address, the system can match the pending invitation, add the new account to the linked organization, and make that organization available in the user's workspace selection context.
   *
   * Validation must reflect the actual schema and business rules. Because `hrm_time_tracking_organization_invitations` has a uniqueness constraint on the combination of organization and email, the same organization must not create conflicting duplicate invitation records for the same email. The target organization must exist and be active in the tenant space represented by `hrm_time_tracking_organizations`. If a role is supplied, it must belong to the same organization context as the invitation. The system should set the initial lifecycle state to a pending invitation state and populate issuance timestamps consistently. Error handling should clearly distinguish missing organization context, insufficient permission, invalid role selection, and duplicate or no-longer-eligible invitation creation attempts.
   *
   * This operation is commonly used together with invitation review endpoints under the same organization scope. A caller would typically create an invitation here, then use organization invitation browsing or detail retrieval operations to monitor whether the invited email remains pending or has been resolved into membership. The later automatic addition of a newly signed-up user is not performed by the client through this endpoint; instead, it occurs as a consequence of the platform's email-based invitation matching rules during account creation.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param body Invitation creation data
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as an
     *   organization-scoped create flow over
     *   `hrm_time_tracking_organization_invitations`.
   *
   * 1. Authorize the caller against the target organization context identified by `organizationId`. Allow only actors with organization onboarding or membership administration authority. Treat owner as fully authorized by hierarchy. If managers are supported by permission policy, verify the relevant permission before continuing. Reject employees without invitation-management authority.
   *
   * 2. Load the target organization from `hrm_time_tracking_organizations` by `id = organizationId` and ensure the record exists. Because the organization table includes `deleted_at`, reject requests against records that are no longer active. Return a not-found style error when the organization does not exist in the active tenant scope.
   *
   * 3. Validate the request body. Require the invitee email and normalize it for uniqueness checks according to the service's email policy. Accept an optional message. If a role identifier is provided in the body, load the referenced role and verify that it belongs to the same organization as `organizationId`. Reject cross-organization role references.
   *
   * 4. Before insert, check `hrm_time_tracking_organization_invitations` for an existing non-deleted invitation with the same `hrm_time_tracking_organization_id` and `email`. Respect the database uniqueness rule on `[hrm_time_tracking_organization_id, email]`. If a conflicting record already exists, return a conflict error describing that the organization already has an invitation for that email address.
   *
   * 5. Create the invitation record in a transaction. Persist `id`, `hrm_time_tracking_organization_id`, optional `hrm_time_tracking_role_id`, normalized `email`, optional `message`, initial `status` representing a pending invitation, `invited_at`, `created_at`, and `updated_at`. Set `accepted_at`, `resolved_at`, `expired_at`, `cancelled_at`, and `deleted_at` to null at creation time unless the persistence layer applies defaults externally.
   *
   * 6. Return the created invitation resource as `IHrmTimeTrackingOrganizationInvitation`. Include the persisted role relationship data only if the response DTO defines it. Ensure the returned record reflects the organization-scoped lifecycle metadata needed by invitation review screens.
   *
   * 7. Do not perform invitation acceptance or membership creation inside this operation. Automatic organization addition for matching sign-up is a later workflow triggered when a user account is created with the same email address as a pending invitation.
   *
   * 8. If the system emits activity or notification side effects, perform them after successful persistence. Keep those side effects non-blocking unless domain rules explicitly require them. Preserve transactional integrity for the invitation record itself even if downstream notifications fail.
   *
   * Handle edge cases explicitly: non-existent organization, inactive organization, unauthorized caller, invalid or foreign role id, duplicate invitation for the same organization and email, and malformed email input.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOrganizationInvitation.ICreate,
  ): Promise<IHrmTimeTrackingOrganizationInvitation> {
    try {
      return await postHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations(
        {
          owner,
          organizationId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of organization invitation records for a specific organization.
   *
   * This operation supports organization membership onboarding review by returning invitation records that belong to the selected organization tenant. It is intended to help authorized users understand which invited email addresses are still waiting to join and which invitations have already been resolved into completed organization membership outcomes. The response should make the invitation lifecycle visible through the stored invitation status and related timestamps such as when the invitation was issued, accepted, resolved, expired, or cancelled.
   *
   * The operation is grounded in the hrm_time_tracking_organization_invitations table, which stores organization-scoped invitation records used to add an existing or future user to an organization membership flow. Each record is tied to exactly one hrm_time_tracking_organizations row through hrm_time_tracking_organization_id, and the schema enforces organization-specific invitation identity through a unique constraint on organization and email. This organization scoping is important because the requirements state that invitations for the same email address across multiple organizations must remain separate and must not grant access outside the organization linked to each invitation.
   *
   * Access to this endpoint should be restricted to authorized organization administrators involved in membership onboarding review, specifically owners and managers with invitation management authority in the current organization context. The endpoint must preserve tenant isolation by returning only invitations for the organization identified by the path parameter and by preventing data exposure from other organizations. When failures occur, the system must keep the failure scoped to the selected organization context and avoid presenting mixed or misleading organization data.
   *
   * Clients typically use this operation to review pending invitations, resolved invitations, and other lifecycle states as part of onboarding monitoring. Search criteria should allow filtering by invitation status and invited email address, together with pagination and sorting suitable for administrative review screens. This endpoint complements invitation creation and invitation resolution flows: pending invitations created for unregistered email addresses remain visible here until matching sign-up resolves them, and when matching sign-up occurs, the resulting onboarding state changes should later be reflected in subsequent reads from this endpoint.
   *
   * Expected behavior should exclude logically removed invitation records by default using the deleted_at lifecycle column unless an internal administrative requirement explicitly says otherwise. Error handling should reject invalid organization identifiers, inaccessible organization scopes, and malformed filter requests. If any external dependency is involved in enriching the response, timeout or integration failure must result in a clear failed outcome rather than a misleading partial success.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param body Invitation search criteria, filters, pagination, and sorting options
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Validate that organizationId is a valid UUID and
     *   resolve the target organization from hrm_time_tracking_organizations
     *   where id matches the path parameter and deleted_at is null. Enforce
     *   authorization so only owner actors and manager actors with invitation
     *   review authority in the selected organization can execute the query.
   *
   * Build a paginated search query over hrm_time_tracking_organization_invitations scoped by hrm_time_tracking_organization_id = organizationId. Exclude records whose deleted_at is not null from normal results. Support filtering by invitation lifecycle status, invited email text search, and date/time ranges on invited_at or other lifecycle timestamps only if those filters are represented in IHrmTimeTrackingOrganizationInvitation.IRequest. Support deterministic sorting for administrative review, with a stable secondary sort such as created_at descending then id descending when primary sort keys are equal.
   *
   * Return summary-oriented invitation rows that expose enough information for onboarding review, including the invitation identity, email, status, intended role reference if present, invitation message if included in the summary DTO, and the relevant lifecycle timestamps needed to distinguish pending, accepted, resolved, expired, and cancelled states. The implementation may left join the related role record if summary output requires role labeling, but it must not leak invitation or role data from another organization.
   *
   * Use cursor-based or page-based pagination according to the shared IRequest and IPage DTO conventions implemented in this service. The response must reflect the filtered total/page metadata expected by IPageIHrmTimeTrackingOrganizationInvitation.ISummary. Ensure request body filters do not duplicate the path-scoped organizationId, because organization context is already fixed by the route.
   *
   * If the organization does not exist, is not visible in the caller's current access scope, or the caller lacks permission, reject the request. If downstream integrations are consulted for enrichment, treat timeout or integration failure as an operation failure and do not fabricate partially confirmed invitation review data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOrganizationInvitation.IRequest,
  ): Promise<IPageIHrmTimeTrackingOrganizationInvitation.ISummary> {
    try {
      return await patchHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitations(
        {
          owner,
          organizationId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information for a single organization invitation within the specified organization context.
   *
   * This operation supports organization membership onboarding review by returning one invitation record that belongs to the current organization. In the domain model, an organization invitation is the business record an organization uses to express its intent to add a specific person to that organization’s workforce. It is always tied to one organization, uses the invited email address as the external contact reference for the intended person, and carries invitation state information that indicates whether the invitation is still waiting to be fulfilled or has already resulted in membership. This endpoint exposes that invitation detail so authorized users can inspect the current onboarding state for one invited person in one tenant context.
   *
   * Security and tenant isolation are central to this operation. The requirements state that invitation review must be presented within the context of the current organization and that invitations for the same email across multiple organizations remain separate organization-specific records. Therefore, the operation must validate both the organization identifier and the invitation identifier together, and it must not return an invitation that belongs to another organization. This prevents cross-organization data exposure and preserves the rule that an invitation in one organization cannot grant access to a different organization.
   *
   * The response is intended for authorized onboarding and membership management workflows. During invitation review, the system must distinguish unresolved pending invitations from invitations already resolved into organization membership, helping owners or permitted managers understand whether the invited email address is still waiting to join or has already completed onboarding. This detail view can be used together with the invitation list operation for the organization: a list endpoint should typically be executed first to browse all invitation records in the current organization, and this detail endpoint is then used to inspect one selected invitation more closely.
   *
   * This operation is read-only. It does not create invitations, resolve them, or perform sign-up matching. Automatic resolution of pending invitations occurs during account creation when a new user signs up with the same invited email address, at which point matching pending invitations are resolved and memberships become available in the user’s organization selection context. If no invitation is found for the given organization and invitation identifiers, or if the caller lacks authority within the organization, the operation must fail without disclosing data outside the authorized organization boundary.
   *
   * @param connection
   * @param organizationId Target organization's unique identifier
   * @param invitationId Target invitation's unique identifier within the organization
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a scoped detail
     *   lookup on the hrm_time_tracking_organization_invitations table.
   *
   * 1. Authenticate the caller and resolve the caller's organization-scoped authority for the target organizationId.
   * 2. Authorize only organization owners and managers with permission to review or manage organization membership onboarding. Reject employees and any caller outside the target organization context.
   * 3. Query hrm_time_tracking_organization_invitations by invitationId and organization foreign key equal to organizationId in a single lookup condition. Do not perform an unscoped lookup by invitationId alone.
   * 4. If no matching row exists, return a not-found error for the scoped resource.
   * 5. Map the invitation record into IHrmTimeTrackingOrganizationInvitation, including the invitation identity, organization linkage, invited email reference, and current invitation state needed to distinguish pending versus resolved onboarding status.
   * 6. If the schema stores resolution linkage or timestamps, include them in the DTO according to the actual schema fields; do not synthesize fields that are not present.
   * 7. Return the detailed DTO as JSON.
   *
   * Validation and edge-case handling:
   * - Validate that organizationId and invitationId are UUID-formatted path parameters.
   * - Enforce organization boundary rules so an invitation from another organization is never exposed even if the invitationId exists.
   * - Preserve the independence of multiple invitations for the same email across different organizations; this endpoint returns only the invitation belonging to the specified organization.
   * - This operation performs no mutation and must not alter invitation state, membership state, or onboarding progress.
   *
   * Related workflow note: automatic resolution of pending invitations is handled during account creation when a sign-up email matches one or more pending invitations. That workflow belongs to account creation and invitation resolution logic, not to this retrieval endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":invitationId")
  public async at(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingOrganizationInvitation> {
    try {
      return await getHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(
        {
          owner,
          organizationId,
          invitationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a specific organization invitation within the selected organization workspace.
   *
   * This operation allows an authorized organization administrator to modify an existing invitation record that is part of the organization's membership onboarding flow. The underlying invitation entity is an organization-scoped invitation record used to add an existing or future user to an organization membership flow. Each record is tied to one organization, stores the invitee email address used to match an existing account or a future signup, may preselect the intended organization-scoped role, and preserves invitation lifecycle state such as pending, accepted, expired, or cancelled. By addressing the invitation through both the organization identifier and the invitation identifier, the API enforces that invitation administration remains inside the proper tenant context.
   *
   * Access to this operation should be restricted to authorized owner and manager actors working in the current organization context. This reflects the requirement that invitation review is part of organization membership onboarding administration. The operation must never allow a user to update an invitation that belongs to a different organization, because invitations remain separate and organization-specific even when the same email address appears in multiple organizations. The nested organization path is therefore not cosmetic; it is a security and tenancy boundary that must be enforced before any update is applied.
   *
   * This operation works against the organization invitation data model, which stores the organization reference, optional intended role reference, invitee email, lifecycle status, optional message, and timestamps for invitation issue, acceptance, resolution, expiration, cancellation, creation, update, and deletion. Consumers typically use invitation list or detail APIs before calling this endpoint so they can identify the current onboarding state for the invited email address. After a successful update, the returned invitation resource should reflect the current persisted state, including any lifecycle timestamp adjustments produced by the update rules.
   *
   * Business logic for this endpoint must respect the invitation onboarding rules already defined for the platform. Automatic organization addition after sign-up is driven by pending invitations that match the sign-up email address. Therefore, updates that move an invitation out of a pending state must prevent later automatic matching, while updates that keep an invitation pending must preserve the email-based matching behavior for future sign-up with the same email address. The operation must not use one invitation to grant access to another organization, and it must not collapse separate invitations from different organizations into a shared record.
   *
   * Validation must ensure that the target organization exists, the target invitation exists, the invitation belongs to that organization, and the requested change is compatible with the current invitation lifecycle state. Attempts to modify deleted records, cross-organization records, or already finalized records in an invalid way should be rejected. If the update references a replacement role, that role must belong to the same organization as the invitation. Expected error handling should return not found for missing scoped resources, forbidden for unauthorized actors, and conflict or bad request for invalid state transitions or invalid organization-scoped references.
   *
   * @param connection
   * @param organizationId Target organization's ID
   * @param invitationId Target invitation's ID within the organization
   * @param body Updated organization invitation information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Load the organization by organizationId from
     *   hrm_time_tracking_organizations where deleted_at is null. Then load the
     *   target invitation by invitationId from
     *   hrm_time_tracking_organization_invitations and verify
     *   hrm_time_tracking_organization_id equals the requested organizationId
     *   and deleted_at is null. If either scoped resource is missing, return a
     *   not-found error.
   *
   * Authorize only organization actors who are allowed to manage invitation onboarding in that organization context, specifically owner and manager roles. Reject employee-level access. The authorization check must be organization-scoped and must not rely on global account identity alone.
   *
   * Parse IHrmTimeTrackingOrganizationInvitation.IUpdate and apply only business-permitted changes. Typical updatable fields include the intended role reference, invitation message, and administrative lifecycle updates such as cancelling or expiring an invitation. The implementation must not rewrite organization ownership of the record, must not move the invitation to another organization, and must not allow updates that break organization-specific invitation separation.
   *
   * If the request includes hrm_time_tracking_role_id or equivalent role selection input, validate that the referenced role exists and belongs to the same organization. Reject cross-organization role references. Preserve the existing invitee email unless the business schema for the update DTO explicitly allows email replacement; if email replacement is supported by the DTO, enforce uniqueness for the pair of organization and email against the @@unique([hrm_time_tracking_organization_id, email]) constraint and reject duplicates.
   *
   * Apply lifecycle transition rules carefully. Pending invitations may remain eligible for later automatic organization join when a matching account signs up with the same email address. If an administrator cancels or expires an invitation, update status consistently and set cancelled_at or expired_at as appropriate, and ensure later sign-up matching no longer treats that invitation as pending. If the business rules allow an accepted or resolved state to be written administratively, require corresponding accepted_at or resolved_at consistency; otherwise reject direct transitions into finalized states and reserve those states for system-driven onboarding resolution.
   *
   * Always update updated_at during a successful write. Execute the change in a transaction when multiple checks or related timestamp changes are involved. Return the fully updated invitation record after persistence. Do not emit cross-user organization availability events from this administrative update alone unless the invitation becomes effective as an actual membership resolution; those real-time updates belong to the sign-up matching or account-addition flow rather than ordinary invitation editing.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":invitationId")
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOrganizationInvitation.IUpdate,
  ): Promise<IHrmTimeTrackingOrganizationInvitation> {
    try {
      return await putHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(
        {
          owner,
          organizationId,
          invitationId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a specific organization invitation record from the selected organization.
   *
   * This operation is used during organization membership onboarding administration to remove an invitation that belongs to one organization tenant and one invitee lifecycle record. The underlying `hrm_time_tracking_organization_invitations` table stores one invitation per organization and email pair, along with invitation lifecycle information such as `status`, `invited_at`, `accepted_at`, `resolved_at`, `expired_at`, `cancelled_at`, `created_at`, `updated_at`, and `deleted_at`. Because invitation review is defined in the context of the current organization, this endpoint removes only the invitation identified by `invitationId` under the organization identified by `organizationId`.
   *
   * The operation is organization-scoped and must be available only to actors who are allowed to manage organization onboarding, specifically owners and managers with the relevant administrative authority in the currently selected organization context. It must never allow one organization's invitation to affect another organization, which aligns with the requirement that invitations for the same email across multiple organizations remain separate. Even if the same email address appears in invitations for other organizations, removing this record affects only the invitation belonging to the specified organization.
   *
   * From a data perspective, the parent `hrm_time_tracking_organizations` record defines the tenant boundary for invitation management, while the invitation record contains the lifecycle state and optional role preselection used during onboarding. The implementation must therefore verify that the targeted invitation's `hrm_time_tracking_organization_id` matches the `organizationId` path parameter before removing it. If the invitation does not belong to that organization, the request must be rejected as not found or inaccessible within the caller's organization scope.
   *
   * This operation is commonly used together with invitation review endpoints that list or inspect organization invitations before an administrator decides to remove one. Administrators would typically review pending and resolved invitations first, then invoke this endpoint when an invitation was issued incorrectly, is no longer needed, or should no longer appear in the onboarding flow. After successful removal, subsequent invitation review results for the same organization should no longer include the erased invitation record.
   *
   * Error handling must clearly distinguish between a missing organization, a missing invitation, an invitation that belongs to another organization, and a caller who lacks permission to manage invitations in the current organization. If the invitation has already been removed, the operation should behave idempotently from the client's perspective or return a consistent not-found result according to service conventions, but it must not remove or alter invitations in any other organization.
   *
   * @param connection
   * @param organizationId Target organization's ID.
   * @param invitationId Target invitation's ID within the specified organization.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement an organization-scoped delete handler
     *   for `hrm_time_tracking_organization_invitations`.
   *
   * 1. Authenticate the caller and resolve the current organization access context.
   * 2. Authorize only organization owners or managers who have invitation or membership onboarding administration permission in the specified organization.
   * 3. Load the parent organization from `hrm_time_tracking_organizations` by `organizationId` and reject when it does not exist or is not accessible in the caller's tenant scope.
   * 4. Load the invitation from `hrm_time_tracking_organization_invitations` by `invitationId` and verify its `hrm_time_tracking_organization_id` equals the requested `organizationId`. Never delete an invitation across organization boundaries.
   * 5. Apply deletion according to repository conventions for this service. Because the schema includes `deleted_at`, downstream implementation may realize this as marking `deleted_at` and updating `updated_at` rather than physically removing the row, but externally the API behavior is removal of the invitation from active review and onboarding flows.
   * 6. Ensure invitation review queries no longer return the removed record as an active invitation for that organization.
   * 7. Perform the state change in a transaction if additional audit logging or related cleanup is required by the service layer.
   * 8. Return success with no response body.
   *
   * Validation and edge cases:
   * - Reject when the caller lacks authority in the specified organization.
   * - Reject when the organization does not exist.
   * - Reject when the invitation does not exist or does not belong to the specified organization.
   * - Do not affect invitations for the same email address in other organizations.
   * - Preserve organization isolation and invitation lifecycle auditability through the service's deletion strategy.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":invitationId")
  public async erase(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("organizationId")
    organizationId: string & tags.Format<"uuid">,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdInvitationsInvitationId(
        {
          owner,
          organizationId,
          invitationId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
