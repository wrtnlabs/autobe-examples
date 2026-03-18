import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IErpHrmTimeTrackingMemberEmailVerification } from "../../../../api/structures/IErpHrmTimeTrackingMemberEmailVerification";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getErpHrmTimeTrackingMemberEmailVerificationsVerificationId } from "../../../../providers/getErpHrmTimeTrackingMemberEmailVerificationsVerificationId";
import { patchErpHrmTimeTrackingMemberEmailVerifications } from "../../../../providers/patchErpHrmTimeTrackingMemberEmailVerifications";

@Controller("/erpHrmTimeTracking/member/email-verifications")
export class ErphrmtimetrackingMemberEmail_verificationsController {
  /**
   * Confirming an email address is a required onboarding step so that a member can safely continue using their account with the registered email.
   *
   * This operation receives a verification token and attempts to resolve it to an existing record in `erp_hrm_time_tracking_member_email_verifications` (token is declared as a unique key). If the token maps to a valid, non-expired, non-invalidated verification record, the system performs the confirmation workflow: it marks the verification as no longer usable (by invalidating/removing or setting the corresponding record state as implemented by the service) and enables the associated member to be treated as having a confirmed email.
   *
   * The verification token lookup is constrained by the database uniqueness rule `@@unique([token])`, and the operation must also respect the token’s lifecycle metadata: `expired_at` (must be in the future for confirmation), and `deleted_at` (records with a deletion timestamp are treated as invalid and cannot be confirmed).
   *
   * Security and authorization: this endpoint is designed for unauthenticated access (guest-style confirmation). The request must not require a member session; instead, it relies exclusively on possession of the token stored in `erp_hrm_time_tracking_member_email_verifications.token`.
   *
   * Validation rules and error handling: if the provided token does not exist, is expired, or targets a record that has been invalidated/removed (indicated by `deleted_at` being set), the system rejects the request with a clear, human-readable explanation of why completion was prevented. For rejected outcomes, the system must not create misleading success activity log entries (the verification confirmation is treated as rejected and must not masquerade as completed).
   *
   * Related operations: after confirmation, the user can proceed to login using the now-confirmed email workflow already defined in the authentication requirements. If the confirmation fails, the operation leaves all persistent state unchanged for the targeted member verification outcome beyond the rejection itself.
   *
   * @param connection
   * @param body Email verification confirmation payload. The system uses the unique `token` to find `erp_hrm_time_tracking_member_email_verifications` record and complete the email confirmation workflow.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Parse request body containing `token` (required) and optional `href`, `ip`, `referrer` for audit/context.
   *
   * 2) Database lookup (transactional read):
   * - Query `erp_hrm_time_tracking_member_email_verifications` by `token` using the unique constraint.
   * - If no record found: reject with an error indicating token is invalid/not found.
   * - If `deleted_at` is not null: reject as invalidated.
   * - If `expired_at` is <= now(): reject as expired.
   *
   * 3) Confirmation state transition (transactional write):
   * - In a single transaction, invalidate the verification record according to the service’s implemented approach (e.g., set `deleted_at` and/or update `updated_at`, and/or any other mechanism the codebase uses to mark token records as invalid).
   * - Update the associated `member` (via the relation from `erp_hrm_time_tracking_member_email_verifications.member_id`) to reflect that email is confirmed. Do not assume specific member columns unless the service layer already knows where to store verification status; Realize Agent should implement the existing mechanism.
   *
   * 4) Idempotency behavior:
   * - If the token already targets a record that is invalidated/consumed (e.g., `deleted_at` set), treat it as rejected (do not re-confirm) to avoid false positives.
   *
   * 5) Response mapping:
   * - Return the resolved verification record fields and a member summary view if the corresponding DTO is available in the codebase; otherwise return verification details only.
   *
   * 6) Edge cases:
   * - Handle race conditions where a token may be invalidated between lookup and update: re-check `deleted_at`/`expired_at` inside the transaction and reject if no longer valid.
   * - Ensure no partial updates: if any step fails, roll back transaction so member verification status and token invalidation remain consistent.
   *
   * 7) Activity logs:
   * - Only record an activity log entry if confirmation completed successfully.
   * - Never record misleading successful activity logs for rejected confirmation attempts.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async confirm(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: IErpHrmTimeTrackingMemberEmailVerification.IRequest,
  ): Promise<IErpHrmTimeTrackingMemberEmailVerification> {
    try {
      return await patchErpHrmTimeTrackingMemberEmailVerifications({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific member email verification record by its verification identifier.
   *
   * This operation reads a single row from the `erp_hrm_time_tracking_member_email_verifications` table using the row primary key `id`. The returned verification record contains the token and verification context fields (including related request metadata such as IP/referrer where stored) and its lifecycle timestamps such as `created_at`, `updated_at`, and `expired_at`.
   *
   * Access is constrained to the currently selected organization context for authenticated member actors. The service layer must ensure that the verification row is associated with a member that belongs to the selected organization before returning the data, preventing cross-organization information leakage.
   *
   * This read-only endpoint is intended to support UI flows that need to display or confirm verification details after the token submission flow. It does not validate token usability or mutate any rows.
   *
   * Expected behavior and error handling:
   * - If `verificationId` does not resolve to an accessible record within the selected organization scope, the request must fail without disclosing whether the record exists in another organization.
   * - On unexpected internal failures, the request fails and no partial data is returned.
   *
   * Related operations may include verification creation and invalidation flows implemented elsewhere in the service; those operations produce the records this endpoint is designed to retrieve.
   *
   * @param connection
   * @param verificationId Target email verification record ID (primary key) to retrieve.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Read inputs: verificationId from path.
   * 2) Resolve access scope:
   *    - Require an authenticated member actor with an active selected organization context (organization-scoped authorization).
   * 3) Fetch verification:
   *    - Query `erp_hrm_time_tracking_member_email_verifications` by `id = verificationId`.
   * 4) Enforce organization isolation:
   *    - Join to `erp_hrm_time_tracking_members` (via `erp_hrm_time_tracking_member_id`) and ensure the member belongs to the currently selected organization context.
   *    - If membership cannot be proven within the selected organization, reject the request.
   * 5) Response mapping:
   *    - Return the verification record fields as defined by the DTO for MemberEmailVerification.
   * 6) Error cases:
   *    - If not found within scope, reject with a consistent failure response (no cross-org leakage).
   *    - Unexpected internal errors reject without partial results.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":verificationId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("verificationId")
    verificationId: string & tags.Format<"uuid">,
  ): Promise<IErpHrmTimeTrackingMemberEmailVerification> {
    try {
      return await getErpHrmTimeTrackingMemberEmailVerificationsVerificationId({
        member,
        verificationId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
