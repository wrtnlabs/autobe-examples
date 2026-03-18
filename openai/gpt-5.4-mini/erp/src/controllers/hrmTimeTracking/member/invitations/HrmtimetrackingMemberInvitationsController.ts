import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingInvitation } from "../../../../api/structures/IHrmTimeTrackingInvitation";
import { IPageIHrmTimeTrackingInvitation } from "../../../../api/structures/IPageIHrmTimeTrackingInvitation";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { deleteHrmTimeTrackingMemberInvitationsInvitationId } from "../../../../providers/deleteHrmTimeTrackingMemberInvitationsInvitationId";
import { getHrmTimeTrackingMemberInvitationsInvitationId } from "../../../../providers/getHrmTimeTrackingMemberInvitationsInvitationId";
import { patchHrmTimeTrackingMemberInvitations } from "../../../../providers/patchHrmTimeTrackingMemberInvitations";
import { postHrmTimeTrackingMemberInvitations } from "../../../../providers/postHrmTimeTrackingMemberInvitations";
import { postHrmTimeTrackingMemberInvitationsInvitationIdRevoke } from "../../../../providers/postHrmTimeTrackingMemberInvitationsInvitationIdRevoke";
import { postHrmTimeTrackingMemberInvitationsTokenAccept } from "../../../../providers/postHrmTimeTrackingMemberInvitationsTokenAccept";
import { putHrmTimeTrackingMemberInvitationsInvitationId } from "../../../../providers/putHrmTimeTrackingMemberInvitationsInvitationId";

@Controller("/hrmTimeTracking/member/invitations")
export class HrmtimetrackingMemberInvitationsController {
  /**
   * Create a new organization invitation for workforce onboarding.
   *
   * This endpoint lets an authorized member invite a person by email into the currently selected organization context. The invitation is used as the basis for employee onboarding and membership management, so the created record must preserve the invited email address and the organization association that issued the invitation.
   *
   * When the invited email already belongs to an existing platform account, the invitation flow may be fulfilled immediately by attaching that account to the organization. When the email does not yet match an existing account, the invitation remains pending until the person later signs up with the same email address. The invitation record is the authoritative link that keeps the intended organization membership in place during that waiting period.
   *
   * Access to this operation is limited to members with employee management permission within the active organization context. The authenticated organization context must be used to scope the invitation, and the request must not be allowed to cross organization boundaries. Validation should ensure the email is well-formed, belongs to the intended recipient, and does not create duplicate invitation records that would conflict with the existing pending invitation behavior described in the requirements.
   *
   * This operation works together with the organization employee management and account onboarding flows: invitation creation is the start of the process, while account creation or existing-account matching completes the membership association later if appropriate.
   *
   * @param connection
   * @param body Invitation details for the target email and any supported invitation metadata.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation should create a new hrm_time_tracking_invitations record scoped to the authenticated user's selected organization. Resolve the active organization from the auth context, not from client input, and enforce that the caller has employee-management authority in that organization.
   *
   * Validate the invited email format and normalize it for matching. If the schema includes additional invitation fields such as role, department, position, note, or expiry metadata, persist them only when present in the actual table definition; do not invent any columns. Before inserting, check for existing pending invitations for the same organization and email to avoid duplicates unless the business rules explicitly allow multiple parallel invitations.
   *
   * If the system design requires immediate fulfillment for existing accounts, the invitation creation service may invoke the membership attachment workflow after insert when a matching account is found. Otherwise, it should only persist the pending invitation and let the sign-up flow resolve it later. The API response should return the created invitation resource with its current status so the client can display whether it is pending or already fulfilled.
   *
   * Use a transaction if invitation insertion and immediate membership fulfillment must happen atomically. Return validation errors for malformed email, unauthorized access, missing organization context, or duplicate pending invitation conflicts. Emit an activity record only if the schema and business rules explicitly require logging for invitation creation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmTimeTrackingInvitation.ICreate,
  ): Promise<IHrmTimeTrackingInvitation> {
    try {
      return await postHrmTimeTrackingMemberInvitations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of organization invitations for employee onboarding and membership management.
   *
   * This endpoint returns invitation records that preserve the invited email address and the organization association used for later matching when a person signs up with the same email. Invitations remain organization-specific, so the results are always scoped to the currently selected organization context and should be filtered only within that tenant boundary.
   *
   * Only members with employee management access may use this operation. It supports searching and browsing invitation records so organization staff can identify pending invitations, review which email addresses have been invited, and inspect whether each record is still waiting for account creation or has already been resolved through email matching.
   *
   * The response is intended for list and workflow screens rather than full record editing. Use the invitation creation endpoint to send a new invitation, and rely on automatic invitation fulfillment during account creation when the invited email later becomes a user account.
   *
   * @param connection
   * @param body Invitation search and pagination criteria for the current organization.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Query hrm_time_tracking_invitations within the selected organization context.
   * Apply tenant isolation first using the authenticated member's active organization.
   * Filter by any provided search criteria such as invited email, invitation status, and date bounds if supported by the request schema.
   * Support pagination and stable ordering, preferably newest invitations first unless the request explicitly overrides sorting.
   * Return summary rows only; do not hydrate unrelated membership or account records unless needed for display fields.
   * Authorize only members with employee management permission in the current organization.
   * If an invitation has already been fulfilled by a matching sign-up, return its current resolved state from the invitation record rather than attempting to infer membership behavior here.
   * If the organization context is missing or invalid, reject the request as forbidden or unprocessable according to the platform's auth layer.
   * Do not modify invitation records in this operation; it is strictly read/search behavior.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IHrmTimeTrackingInvitation.IRequest,
  ): Promise<IPageIHrmTimeTrackingInvitation.ISummary> {
    try {
      return await patchHrmTimeTrackingMemberInvitations({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single organization invitation and inspect its onboarding state.
   *
   * This endpoint returns the invitation record that was created for a specific organization when a member invited an email address to join the platform. The response exposes the invitation's email address, lifecycle status, expiration timestamp, acceptance timestamp, revocation timestamp, and audit fields so an organization administrator can understand whether the invite is still pending, already accepted, expired, revoked, cancelled, or otherwise completed.
   *
   * The invitation entity is organization-scoped and belongs to the tenant boundary that issued it. For that reason, the server must verify that the requested invitation exists in the currently selected organization context before returning it. The response may also include links to the user account that eventually matched the invitation and to the member who created the invitation, reflecting the invitation flow used for email-based onboarding and automatic membership fulfillment.
   *
   * Only authenticated members with employee management access should be able to use this endpoint, because invitation handling is part of employee onboarding and membership management. If the caller does not have permission in the current organization, or if the invitation does not belong to the current organization context, the request must fail with an authorization or not-found error. The operation does not accept a request body because it is a single-resource read operation identified entirely by the invitation ID in the path.
   *
   * @param connection
   * @param invitationId Invitation identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement a detail lookup against hrm_time_tracking_invitations using the invitation UUID from the path. Resolve the record only within the current organization context; the service must join or filter by organization_id so invitations from another tenant cannot be accessed even if the UUID is known.
   *
   * Load the invitation together with the minimal related context needed for the detail response: organization reference, invitedByMember reference, and userAccount reference when present. Do not perform mutation logic here; this endpoint is read-only and must not change status, accepted_at, revoked_at, or any other lifecycle field.
   *
   * Validate access with the authenticated member's organization-scoped permissions. Require employee-management capability for the selected organization before querying or before returning the record, depending on the platform's authorization pattern. If the invitation is missing, deleted, or outside the current organization, return not found to avoid leaking cross-tenant existence. If the caller lacks permission, return forbidden.
   *
   * Return the invitation entity in full-detail form, including id, organizationId, userAccountId, invitedByMemberId, email, token, status, expiresAt, acceptedAt, revokedAt, createdAt, updatedAt, and deletedAt if the API surface exposes archival metadata. Keep token exposure aligned with security policy; if tokens are considered sensitive in the public contract, omit them from the public response schema and expose only server-side internal data. Otherwise, document the response schema consistently with the actual contract used by the platform.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":invitationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingInvitation> {
    try {
      return await getHrmTimeTrackingMemberInvitationsInvitationId({
        member,
        invitationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing invitation record for an organization.
   *
   * This operation is used by employee-management workflows to adjust the state of a workforce invitation that was previously created for a specific organization. The invitation record stores the invited email address, invitation token, lifecycle status, expiration timestamp, and optional links to the inviting member and the user account that eventually matches the invitation. Updating this record allows administrators to correct invitation details, extend or shorten validity, and manage invitation state as the onboarding process evolves.
   *
   * Access to this endpoint must be restricted to authenticated organization members who have employee management authority in the current organization context. Because invitations are organization-scoped, the service must verify that the target invitation belongs to the active organization before applying any changes. The invitation must also respect the uniqueness rule on the combination of organization and email, so any email change must be validated against existing invitations in the same organization.
   *
   * The service should only accept mutations for fields that are designed to change after creation. System-managed values such as the invitation identifier, organization reference, token, creation timestamp, and update timestamp are not provided by the client. If the invitation has already been accepted, expired, or revoked, the implementation should enforce the business rules for whether further edits are allowed and return a validation error when the state transition is not permitted.
   *
   * This endpoint is commonly used together with invitation listing and invitation detail retrieval endpoints. It does not perform sign-up fulfillment itself; if the invited email later becomes a user account, the automatic organization addition flow is handled by the account-creation workflow and not by this update operation.
   *
   * @param connection
   * @param invitationId Target invitation identifier.
   * @param body Invitation fields to update.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the invitation by invitationId within the current organization scope, then verify the authenticated member has employee-management permission for that organization.
   *
   * Accept a full update payload for mutable invitation fields. Validate email normalization, uniqueness of (organization_id, email), allowed status transitions, and expiration date consistency. Do not allow clients to modify id, organization_id, token, created_at, or updated_at directly.
   *
   * If the invitation is linked to a user account, preserve the link unless the business rules explicitly allow administrative reassignment; in that case, validate the new user_account_id exists and belongs to the same global account domain. If invited_by_member_id is exposed as mutable in the DTO, ensure the new inviter is a valid member of the same organization.
   *
   * Use a transaction to update the invitation record and, if status changes to revoked or accepted, set revoked_at or accepted_at consistently when applicable. updated_at should be refreshed automatically by the persistence layer.
   *
   * Return 404 when the invitation does not exist in the current organization scope. Return 403 when the actor lacks employee-management rights. Return 409 or 422 when the update would violate uniqueness or lifecycle rules, such as duplicate email within the organization or invalid status transitions.
   *
   * Do not trigger account creation, membership creation, or sign-up fulfillment from this endpoint; those belong to the separate invitation fulfillment flow that runs when a matching user account is created.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":invitationId")
  public async update(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingInvitation.IUpdate,
  ): Promise<IHrmTimeTrackingInvitation> {
    try {
      return await putHrmTimeTrackingMemberInvitationsInvitationId({
        member,
        invitationId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove an invitation from the current organization.
   *
   * This operation deletes an organization invitation that was created to onboard a future employee by email. Invitations are organization-scoped records used by employee management flows, so the authenticated member must already be operating inside the correct organization context and must have employee management access to perform this action.
   *
   * The invitation record is identified by `invitationId` and must belong to the current organization. If the invitation has not yet been fulfilled, removing it cancels the pending onboarding path for that email address in this organization. If the invitation has already been resolved through the platform's automatic membership handling, the service must apply the invitation lifecycle rules and either remove the remaining invitation record when allowed or reject the request when the record is no longer eligible for deletion.
   *
   * This endpoint is intended to be used together with the invitation creation and fulfillment flows. It allows organization owners and employee managers to retract a pending invitation when the candidate should no longer be added, while preserving the system behavior that keeps invitations distinct per organization and matches them later by the invited email address.
   *
   * @param connection
   * @param invitationId Unique invitation identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the invitation by invitationId within the current organization context and verify that it belongs to the authenticated member's organization scope. Require employee management permission before proceeding.
   *
   * If no invitation is found for that invitationId in the current organization, return a not-found error. If the invitation exists but belongs to a different organization, treat it as not found to preserve tenant isolation.
   *
   * Before removal, check any business-state constraints from the invitation lifecycle. If the invitation is still pending and deletable, delete the invitation record in a single transaction. If the record has already been consumed or is otherwise protected by the invitation workflow, reject the request with a conflict-style error rather than partially modifying related membership data.
   *
   * Do not cascade into member, employee, or organization records. Invitation deletion only affects the invitation record itself. No request body is needed. Return the deleted invitation representation on success so callers can confirm the removed resource.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":invitationId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingMemberInvitationsInvitationId({
        member,
        invitationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Accept a pending organization invitation using the invitation token embedded in the URL.
   *
   * This operation completes the invitation fulfillment flow for a pending invitation record that preserves the invited email address and the organization association while the invitation is awaiting action. When the token is valid and the invitation is still pending, the system converts that pending invitation into organizational membership for the invited account and makes the person available inside the target organization without requiring a separate manual onboarding step.
   *
   * The acceptance flow is tied to the organization that issued the invitation and must honor the invitation rules around pending state, email association, and multiple concurrent invitations for the same email address. If several organizations have pending invitations for the same email, each matching invitation must be processed independently according to its own record. If the token is invalid, expired, already used, or does not correspond to a pending invitation, the request must fail with an appropriate validation or not-found style error.
   *
   * This endpoint is intended to be used by the invited person as part of the join-organization workflow. It does not modify invitation metadata directly; instead, it executes the business process that consumes the invitation and establishes the organization relationship for the account. The returned result should allow the client to confirm which organization was joined and whether the invitation was successfully fulfilled.
   *
   * @param connection
   * @param token Invitation acceptance token.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this as a token-scoped invitation fulfillment command.
   *
   * Steps:
   * 1. Resolve the invitation record by token from the hrm_time_tracking_invitations table.
   * 2. Verify the invitation exists, is still pending, and is eligible for acceptance.
   * 3. Check the invited email stored on the invitation against the currently authenticated member account when an account context exists. If the current request is from a newly created account or a session that has not yet been attached, use the invitation token and invitation email as the source of truth for fulfillment.
   * 4. In a transaction, mark the invitation as accepted/fulfilled according to the actual invitation status model, and create or attach the organization membership/employee linkage required by the domain rules.
   * 5. If there are multiple pending invitations for the same email, process only the invitation addressed by this token; other invitations remain untouched.
   * 6. Prevent double-acceptance by rejecting already-fulfilled tokens.
   * 7. Return the fulfilled invitation outcome, including the organization context and the resulting membership reference if the schema supports it.
   *
   * Validation and error handling:
   * - Return 404 when no invitation matches the token.
   * - Return 409 or validation error when the invitation is no longer pending or has already been consumed.
   * - Return 422 when the email/account relationship does not match the invitation’s invited email.
   * - Use a transaction to ensure invitation fulfillment and membership creation are atomic.
   *
   * Security and authorization:
   * - Allow the invited user or an authenticated member completing their own invitation flow to call this endpoint.
   * - Do not require organization-scoped permissions because the invitation token itself authorizes the specific acceptance action.
   * - Ensure the operation cannot be used to accept a different person’s invitation by comparing the token-bound email association with the current account context where available.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":token/accept")
  public async accept(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("token")
    token: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingInvitation> {
    try {
      return await postHrmTimeTrackingMemberInvitationsTokenAccept({
        member,
        token,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Revoke a pending invitation for an organization and prevent it from being fulfilled later.
   *
   * This operation is used when an organization no longer wants an invited email address to remain eligible for automatic membership creation. The invitation belongs to the organization that created it, preserves the invited email address, and may coexist with other pending invitations for the same email in other organizations. Revoking one invitation affects only that invitation record and does not interfere with unrelated pending invitations or existing memberships elsewhere.
   *
   * Access to this action is restricted to members with employee management permission in the current organization context. The authenticated user must be acting inside the organization that owns the invitation, and the invitation must still be in a revocable state. If the invitation has already been resolved into membership because the invited person signed up with the matching email address, the request must be rejected because the invitation can no longer be used for onboarding.
   *
   * This operation is closely related to invitation listing and invitation creation endpoints. A client typically lists pending invitations, revokes one when needed, and then refreshes the invitation list to reflect the updated status. The returned invitation data allows the UI to show the final state immediately after the action completes.
   *
   * @param connection
   * @param invitationId Identifier of the invitation to revoke.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the invitation by invitationId within the current organization context. Verify the authenticated member has employee management permission for that organization before performing any change.
   *
   * Check that the invitation exists, belongs to the current organization, and is still pending or otherwise revocable. If the invitation has already been fulfilled, expired, or is otherwise not eligible for revocation according to business rules, return a conflict-style error and do not modify data.
   *
   * Apply the revocation as a state transition on the invitation record. Preserve the invited email address and organization association for auditability, but mark the invitation as revoked so it cannot be used for future membership fulfillment. Do not touch other invitations that share the same email address. Do not create or delete membership records as part of revocation.
   *
   * If the persistence model uses a status field, update only that field and any revocation timestamp or reason fields that already exist in the schema; do not assume additional columns. If the model instead uses a dedicated action marker, persist the revocation in the smallest possible write consistent with schema constraints. Return the updated invitation after the transaction commits.
   *
   * Ensure the operation is idempotent only if the business layer explicitly supports repeated revocation requests. Otherwise, a second revocation attempt on the same invitation should fail with a clear domain error. Emit an activity record only if the application already records invitation lifecycle actions and such a schema exists in the loaded model set.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post(":invitationId/revoke")
  public async revoke(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("invitationId")
    invitationId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingInvitation> {
    try {
      return await postHrmTimeTrackingMemberInvitationsInvitationIdRevoke({
        member,
        invitationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
