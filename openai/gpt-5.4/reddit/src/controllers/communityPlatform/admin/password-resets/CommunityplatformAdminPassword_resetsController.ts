import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformMember } from "../../../../api/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "../../../../api/structures/ICommunityPlatformMemberPasswordReset";
import { IPageICommunityPlatformMemberPasswordReset } from "../../../../api/structures/IPageICommunityPlatformMemberPasswordReset";
import { AdminAuth } from "../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../decorators/payload/AdminPayload";
import { deleteCommunityPlatformAdminPasswordResetsPasswordResetId } from "../../../../providers/deleteCommunityPlatformAdminPasswordResetsPasswordResetId";
import { getCommunityPlatformAdminPasswordResetsPasswordResetId } from "../../../../providers/getCommunityPlatformAdminPasswordResetsPasswordResetId";
import { patchCommunityPlatformAdminPasswordResets } from "../../../../providers/patchCommunityPlatformAdminPasswordResets";
import { postCommunityPlatformAdminPasswordResets } from "../../../../providers/postCommunityPlatformAdminPasswordResets";
import { putCommunityPlatformAdminPasswordResetsPasswordResetId } from "../../../../providers/putCommunityPlatformAdminPasswordResetsPasswordResetId";

@Controller("/communityPlatform/admin/password-resets")
export class CommunityplatformAdminPassword_resetsController {
  /**
   * Create a new member password reset request for account recovery.
   *
   * This operation issues a password reset request record for a registered member account and stores it in the password reset request data set represented by community_platform_member_password_resets. That table is described as time-bound member account recovery support data that stores the issued reset token together with request origin metadata and lifecycle timestamps. In this API, the request initiates recovery by locating the target member account from its unique login identifier and creating a new reset record that belongs to exactly one community_platform_members row.
   *
   * The operation is intended for unauthenticated account-recovery use, not for normal signed-in account management. The loaded requirements state that password change itself is available only to the account holder and requires authentication, but this endpoint exists earlier in the recovery sequence so that a person who cannot sign in can begin a reset flow. For security, implementations should avoid disclosing whether the submitted email matches an existing account, even though the underlying member table has a unique email column and the reset table belongs to one member account.
   *
   * From a data perspective, the created record should reflect the schema comments on community_platform_member_password_resets by capturing the secure unique reset token, the originating IP address, the application URL where the request was initiated, the referrer URL context, and the expiration timestamp after which the token is no longer valid. The created record starts as an unused and active reset request, so used_at and revoked_at remain unset at creation time. The operation relates directly to community_platform_members because each reset record references one owner member account through community_platform_member_id.
   *
   * This operation is commonly followed by a separate password update or password recovery completion endpoint that consumes the issued token and sets used_at when the password is successfully changed. If a new request is created while earlier reset requests are still active, the implementation may revoke prior outstanding requests for the same member to keep recovery state independently revocable and auditable as described by the schema. Error handling must reject malformed input and must not modify the member password during this step.
   *
   * @param connection
   * @param body Password reset request creation data
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Accept a JSON request body typed as
     *   ICommunityPlatformMemberPasswordReset.ICreate containing the account
     *   recovery input needed to create a password reset request.
   *
   * Resolve the target member from community_platform_members using the submitted unique email address. If no active member exists for the email, do not reveal that fact through a distinct success payload or error shape; instead, return a generic success result or a response structurally equivalent to the normal creation response according to service policy. Do not require authentication for this operation because it serves pre-authentication account recovery.
   *
   * When a matching member exists, generate a cryptographically strong unique reset token that satisfies the @@unique([token]) constraint on community_platform_member_password_resets. Compute expired_at according to the service's password recovery validity policy. Capture request origin metadata from trusted request context and body fields as appropriate: client IP address, initiating application href, and referrer URL.
   *
   * Within a transaction, optionally revoke previously outstanding reset requests for the same member by setting revoked_at on existing rows that are not used, not revoked, and not expired if the recovery policy allows only one active token at a time. Insert a new community_platform_member_password_resets row with a new UUID id, the resolved community_platform_member_id, generated token, ip, href, referrer, expired_at, null used_at, null revoked_at, current timestamps for created_at and updated_at, and null deleted_at.
   *
   * Return the created password reset request resource. Never return member.password_hash. The implementation must not change community_platform_members.password_hash, status, or last_signed_in_at during this operation. Validate required fields, reject structurally invalid email or URL values, and handle token uniqueness collision by regenerating and retrying before failing. Log the creation event for security auditing without exposing the raw token in ordinary application logs.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: ICommunityPlatformMemberPasswordReset.ICreate,
  ): Promise<ICommunityPlatformMemberPasswordReset> {
    try {
      return await postCommunityPlatformAdminPasswordResets({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of member password reset request records for security administration and account-recovery oversight.
   *
   * This operation exposes password reset request data stored in the community_platform_member_password_resets table, which is described as time-bound member account recovery support data kept separate from the main member account so recovery history remains normalized, auditable, and independently revocable. The result allows authorized administrators to review the lifecycle of reset requests, including whether a token is still pending, has been used to change a password, has been revoked before use, or has passed its expiration point. Because each record belongs to exactly one community_platform_members account, the list may also be searched in relation to the owning member identity.
   *
   * Access to this operation should be restricted to administrators because the underlying records contain sensitive security-support metadata such as originating IP address, request URL context, referrer context, expiration state, and token usage lifecycle timestamps. General members are allowed to manage only their own account credentials according to the loaded password-change requirements, and those requirements do not establish a general-purpose browsing capability for password reset history. This endpoint therefore serves platform-level security review, support investigation, and abuse monitoring rather than routine member self-service.
   *
   * The response should be optimized for list browsing and operational review. Clients may submit complex search criteria in the request body to filter by member code, member email, member account status, email verification state, reset token lifecycle timestamps, and whether the reset request is active, used, revoked, expired, or logically removed from active use. Pagination and sorting support are expected so administrators can inspect recent account-recovery activity, find suspicious bursts of reset requests, or locate a specific member's recovery history efficiently.
   *
   * This operation is related to account authentication and password management workflows but does not itself change credentials or consume reset tokens. It should be used when support or administrative staff need to inspect existing reset-request records after member-facing recovery or password-change flows occur elsewhere in the system. If the request filters are invalid, or if the caller lacks administrative authority, the operation must reject the request without disclosing restricted security details.
   *
   * @param connection
   * @param body Search criteria and pagination options for password reset requests
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement an administrative search operation over
     *   the community_platform_member_password_resets table with an inner join
     *   to community_platform_members through
     *   community_platform_member_password_resets.community_platform_member_id
     *   = community_platform_members.id.
   *
   * Accept a JSON request body typed as ICommunityPlatformMemberPasswordReset.IRequest. The request DTO should support pagination, sortable fields, and optional filters based only on verified schema columns and the verified member relation. Valid filter categories include reset record identifiers, member-facing account identifiers such as member code and email, member security state such as email_verified and status, and reset lifecycle timestamps such as created_at, expired_at, used_at, revoked_at, updated_at, and deleted_at. Implement partial matching only for string fields that make sense operationally, such as email, ip, href, and referrer, and exact matching for identifiers and booleans unless the DTO explicitly defines broader semantics.
   *
   * Compute lifecycle-aware conditions from actual columns rather than assumed status fields. For example, a pending reset is a record with used_at null, revoked_at null, and expired_at in the future; a used reset has used_at not null; a revoked reset has revoked_at not null; an expired unused reset has expired_at before now and used_at null and revoked_at null. If the request DTO exposes a lifecycle filter, translate that filter into these SQL predicates. Do not invent a stored status column because none exists in the loaded schema.
   *
   * Exclude logically removed records by default when appropriate for administrative browsing unless the request explicitly asks to include deleted rows, because deleted_at exists on the reset table. Any default exclusion rule must be implemented transparently and documented in the request DTO behavior. Preserve deterministic ordering, preferably by created_at descending and id descending as a stable tie-breaker when no explicit sort is provided.
   *
   * Select summary fields needed for ICommunityPlatformMemberPasswordReset.ISummary from the reset table and the joined member table. Include enough information for operational review, such as reset id, member reference summary, request origin metadata, and lifecycle timestamps, but never return the raw token value if the summary contract does not explicitly require it. If implementation layers can avoid selecting token entirely, do so to reduce exposure of sensitive recovery artifacts.
   *
   * Authorize only admin actors. If the caller is not authenticated as an administrator, reject the request before executing the query. Validate pagination bounds and sortable field allow-lists to prevent unbounded scans or invalid order clauses. Return a paginated response typed as IPageICommunityPlatformMemberPasswordReset.ISummary. Handle empty result sets by returning a valid page object with an empty data array rather than an error.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: ICommunityPlatformMemberPasswordReset.IRequest,
  ): Promise<IPageICommunityPlatformMemberPasswordReset.ISummary> {
    try {
      return await patchCommunityPlatformAdminPasswordResets({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the detailed information for a specific member password reset request record.
   *
   * This operation returns one time-bound password reset resource associated with the community platform's member account recovery domain. The underlying entity is the subsidiary actor record represented by `community_platform_member_password_resets`, which stores password reset requests for `community_platform_members`. The operation is intended to expose the state of a single reset request identified by `passwordResetId`, allowing downstream internal account-recovery logic or privileged administration tooling to inspect whether the record exists and to read its current recovery-related attributes.
   *
   * Because password reset records are part of account security and recovery behavior, access to this operation must be tightly controlled. It must not be treated as a public browsing endpoint. Guest users must not be allowed to enumerate or inspect password reset requests, and ordinary members must not be able to read arbitrary reset records belonging to other accounts. Any exposure of this endpoint should be limited to trusted internal workflows or explicitly authorized privileged actors, with ownership or administrative checks applied before any data is returned.
   *
   * This operation is related to account login, password change, and account protection requirements, but it does not itself perform authentication, session establishment, or password mutation. Instead, it supports the password recovery lifecycle by reading an existing reset-request record. If the identified password reset record does not exist, is not visible to the requesting actor, or is otherwise outside the allowed recovery context, the system must reject the request rather than disclose sensitive recovery information.
   *
   * Clients should use this endpoint only when they already possess the target reset request identifier from an earlier trusted recovery flow. It is not a discovery API and should not be used as a substitute for login or password change operations. Related password-changing behavior remains governed by authenticated account-management requirements, while this endpoint is limited to retrieval of a single password reset resource.
   *
   * @param connection
   * @param passwordResetId Target password reset request identifier
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement a detail-read service for one record in
     *   `community_platform_member_password_resets` identified by the
     *   `passwordResetId` path parameter.
   *
   * 1. Parse `passwordResetId` as a UUID and query the password reset table by primary identifier.
   * 2. If no matching record exists, return a not-found error.
   * 3. Before returning data, enforce strict authorization. This operation should be callable only from privileged internal account-recovery flows or explicitly authorized administrative contexts. If ownership-based access is supported, confirm that the reset record belongs to the requesting member account; otherwise deny access.
   * 4. Load any required member linkage from `community_platform_members` only as needed to validate visibility or construct the DTO. Do not expose secret recovery tokens, password hashes, or other credential material if such fields exist in the schema.
   * 5. Evaluate time-bound usability according to the password reset record's stored lifecycle fields. If the implementation tracks expiration or prior consumption, include those states in the returned DTO but do not mutate them in this read operation.
   * 6. Return a single `ICommunityPlatformMemberPasswordReset` object.
   *
   * Edge cases and safeguards:
   * - Reject malformed UUID input before querying.
   * - Do not leak whether a record belongs to another account through differential error details.
   * - Do not perform any password update, token issuance, or session creation here.
   * - Keep the operation read-only and side-effect free.
   * - Ensure logging and audit handling avoid storing sensitive reset secrets in plaintext logs.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":passwordResetId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformMemberPasswordReset> {
    try {
      return await getCommunityPlatformAdminPasswordResetsPasswordResetId({
        admin,
        passwordResetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Complete a password recovery flow for a specific member password reset request.
   *
   * This operation consumes an existing password reset request from the community_platform_member_password_resets table, validates that the reset attempt is still eligible for use, and then applies a new password to the linked community_platform_members account. The password reset record is security-support data tied to exactly one member account through community_platform_member_id, while the member account remains the canonical authenticated identity that owns communities, subscriptions, posts, comments, votes, and reports. The endpoint therefore updates credential state on the member while also updating the lifecycle state of the reset record itself.
   *
   * This operation is intended for account recovery when the requester is outside a valid signed-in member session. Unlike the authenticated password change flow for a logged-in member's own account, this recovery path relies on the specific password reset request and its validation data. The service must ensure that the identified reset request has not expired, has not already been consumed, has not been revoked, and still belongs to an existing member account. If any of those checks fail, the system must reject the request and leave the member's existing password unchanged.
   *
   * The underlying member schema describes email as the unique login identifier, password_hash as the stored hashed credential, email_verified as the account-level verification state, and status as the lifecycle state of the account. This endpoint must only replace the password credential and update related audit timestamps needed for recovery completion. It must not alter the member's identity, username-equivalent account continuity, profile ownership, karma-related relationships, community ownership, subscriptions, posts, comments, votes, reports, or moderation roles. It must also mark the reset request as consumed so the same recovery artifact cannot be reused.
   *
   * Clients typically use this operation after a prior password reset initiation flow has issued a recovery token and communicated it to the member. The passwordResetId path parameter identifies the target reset request record, and the request body provides the recovery completion payload. On success, the response returns the updated member account representation so downstream clients can confirm the target account context. On failure, the service must report that the reset request is invalid, unavailable, or no longer usable without exposing sensitive credential comparison details.
   *
   * @param connection
   * @param passwordResetId Target password reset request ID
   * @param body Password reset completion data
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implement a service method that loads
     *   community_platform_member_password_resets by id using the
     *   passwordResetId path parameter and joins the owning
     *   community_platform_members row through community_platform_member_id.
   *
   * Validate that the reset request exists, is not deleted, and references an existing member record. Validate the client-provided recovery credential in the request body against the stored reset request state according to the request DTO contract. Reject the operation if the reset request has expired_at earlier than the current timestamp, if used_at is already set, or if revoked_at is already set. Reject the operation if the target member account does not exist.
   *
   * Validate the new password according to the application's credential policy. Do not accept client input for internal lifecycle columns such as used_at, revoked_at, deleted_at, or password_hash. Instead, hash the supplied new password inside the service layer and update community_platform_members.password_hash with the new hashed value. Preserve community_platform_members.id, code, email, email_verified, status, and all ownership relationships. Optionally update updated_at on the member and set used_at plus updated_at on the reset request record.
   *
   * Execute the member credential update and password reset consumption update in a single database transaction so the password cannot change without the reset request being consumed, and the reset request cannot be consumed without the password change succeeding. After commit, return the updated community_platform_members projection as ICommunityPlatformMember.
   *
   * Error handling must distinguish not found reset request, unusable reset request, and invalid recovery payload. In all rejection cases, do not modify the member password and do not mark the reset request as used. Avoid leaking whether any unrelated account exists beyond the specific reset request resource already identified by path.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":passwordResetId")
  public async updatePassword(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformMemberPasswordReset.IUpdate,
  ): Promise<ICommunityPlatformMember> {
    try {
      return await putCommunityPlatformAdminPasswordResetsPasswordResetId({
        admin,
        passwordResetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently revoke and remove a specific password reset request for the authenticated member account.
   *
   * This operation manages one record from the community_platform_member_password_resets table, which stores time-bound member account recovery attempts for community_platform_members. Each password reset request contains a unique recovery token together with request-origin metadata such as IP address, href, referrer, expiration timestamp, consumption timestamp, and revocation timestamp. Deleting a reset request removes that recovery attempt from active use so the associated token can no longer participate in member account recovery.
   *
   * This endpoint is a protected account-security operation. The communityPlatform requirements state that protected password-related actions require authentication, and self-service account actions are limited to the acting user's own account. Accordingly, the caller must be authenticated and must own the target password reset request through the community_platform_member_id relationship. Requests for reset records owned by another member must be rejected. If the target password reset request does not exist, or if it is not accessible to the authenticated member, the operation must fail without affecting any other password reset records.
   *
   * At the data layer, the operation acts on subsidiary security support data rather than public business content. The community_platform_member_password_resets model is intentionally separated from the main member identity table so recovery history remains normalized, auditable, and independently revocable. For that reason, the delete behavior should also ensure that the reset request becomes unusable immediately by recording revocation semantics before removing it from active query results. Implementations should respect the table's lifecycle fields, especially revoked_at, used_at, expired_at, and deleted_at, and should avoid changing the owning community_platform_members account identity itself.
   *
   * This endpoint may be used together with password recovery initiation and password change flows. For example, a member who requested multiple recovery links may use this operation to invalidate a specific outstanding request before using another valid request. After this operation succeeds, any later attempt to consume the removed or revoked token must fail because that recovery attempt is no longer active.
   *
   * Error handling must be explicit and conservative. Unauthenticated callers must be denied. A request targeting a non-existent passwordResetId must be rejected. A request targeting another member's reset request must also be rejected. Successful execution should affect only the single identified reset request and should not alter the member's account code, email, password_hash, or unrelated reset records.
   *
   * @param connection
   * @param passwordResetId Target password reset request identifier.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Authenticate the caller as a member before any
     *   data access.
   *
   * Load the community_platform_member_password_resets row by id using passwordResetId. If no row exists, return a not-found style failure. Verify that the row belongs to the authenticated member by comparing community_platform_member_id with the caller's member id. If ownership does not match, reject the request as forbidden.
   *
   * Within a transaction, make the target reset request unusable immediately. If revoked_at is null, set revoked_at to the current timestamp. Then remove it from active use according to the persistence strategy used in this service. Because the schema includes deleted_at, the preferred implementation is to set deleted_at to the current timestamp and persist updated_at. If the service chooses to physically delete rows instead, it must still ensure the token can no longer be used and must preserve the invariant that the targeted recovery attempt is no longer active. Do not modify the related community_platform_members row except for any optional audit linkage outside this schema.
   *
   * If the reset request is already used, expired, revoked, or deleted, treat the operation as deleting an already inactive recovery attempt. The implementation may either return success idempotently after confirming ownership or reject based on service policy, but it must never reactivate the token and must leave other reset requests unchanged.
   *
   * After commit, return success with no response body. Ensure subsequent password recovery token validation excludes records with revoked_at set, deleted_at set, used_at set, or expired_at earlier than the current time.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":passwordResetId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformAdminPasswordResetsPasswordResetId({
        admin,
        passwordResetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
