import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOwnerPasswordReset } from "../../../../api/structures/IHrmTimeTrackingOwnerPasswordReset";
import { OwnerAuth } from "../../../../decorators/OwnerAuth";
import { OwnerPayload } from "../../../../decorators/payload/OwnerPayload";
import { deleteHrmTimeTrackingOwnerPasswordResetsPasswordResetId } from "../../../../providers/deleteHrmTimeTrackingOwnerPasswordResetsPasswordResetId";
import { getHrmTimeTrackingOwnerPasswordResetsPasswordResetId } from "../../../../providers/getHrmTimeTrackingOwnerPasswordResetsPasswordResetId";
import { patchHrmTimeTrackingOwnerPasswordResets } from "../../../../providers/patchHrmTimeTrackingOwnerPasswordResets";
import { postHrmTimeTrackingOwnerPasswordResets } from "../../../../providers/postHrmTimeTrackingOwnerPasswordResets";
import { putHrmTimeTrackingOwnerPasswordResetsPasswordResetId } from "../../../../providers/putHrmTimeTrackingOwnerPasswordResetsPasswordResetId";

@Controller("/hrmTimeTracking/owner/password-resets")
export class HrmtimetrackingOwnerPassword_resetsController {
  /**
   * Initiate a password reset request for an owner, manager, or employee account identified by email address and actor type.
   *
   * This operation creates a one-time password reset request record for the selected account type within the HRM time tracking platform. The platform maintains separate authenticated identity tables for owners, managers, and employees, and each of those actor tables has a dedicated password reset table for issued reset tokens and their lifecycle metadata. As documented in the database schema, these reset tables preserve the issued token, expiration deadline, consumption status, and timestamps needed for security review and operational auditing, while the actor tables themselves remain focused on core authentication fields such as the unique sign-in email and hashed password.
   *
   * The operation is part of the account security boundary rather than an organization-scoped business workflow. Requirements state that users sign in with email and password and that no OAuth provider workflow exists for account access. Because password recovery occurs before a user can authenticate, this endpoint should be callable without an existing authenticated session. Even so, the implementation must handle responses carefully so that callers do not learn whether a particular email exists, which actor type is valid for that email, or whether a reset request was previously issued.
   *
   * When the request is accepted, the system creates a new record in the corresponding password reset table: hrm_time_tracking_owner_password_resets for owners, hrm_time_tracking_manager_password_resets for managers, or hrm_time_tracking_employee_password_resets for employees. The created record must be linked to the actor account through the appropriate foreign key column and must populate the token and expiration fields defined by that table. The response should communicate that the request has been accepted for processing without returning the raw reset token or internal record identifiers.
   *
   * This operation is normally followed by a separate password reset completion flow that consumes the issued token and replaces the previous password. That subsequent flow must preserve the same underlying account identity and associated organization memberships, as required by the password maintenance requirements. If downstream notification delivery or any external integration used to send reset instructions fails, the system must not report the reset request as successfully completed in a misleading way; instead, it must follow the integration failure policy and present the action as failed while preserving unrelated existing data.
   *
   * Expected error handling includes rejecting structurally invalid requests, rejecting unsupported actor kinds, and handling integration or delivery failures without exposing cross-organization or cross-actor data. The endpoint should not disclose whether the target email belongs to an existing account, because the actor tables are global authentication identities and exposing lookup results would weaken account security.
   *
   * @param connection
   * @param body Password reset request target information
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Validate the JSON request body against
     *   IHrmTimeTrackingPasswordReset.ICreate. Require the caller to provide
     *   the actor kind and account email used for password recovery.
   *
   * Normalize the email address according to the service's authentication policy before lookup. Branch by actor kind:
   * - owner -> query hrm_time_tracking_owners by unique email and ignore rows that are no longer valid for authentication according to service rules.
   * - manager -> query hrm_time_tracking_managers by unique email and ignore rows that are no longer valid for authentication according to service rules.
   * - employee -> query hrm_time_tracking_employees by unique email and ignore rows that are no longer valid for authentication according to service rules.
   * If the request references an unsupported actor kind, reject the request as invalid.
   *
   * For a matched account, generate a cryptographically secure unique reset token, compute its expiration timestamp, and insert a new row into the corresponding password reset table. Use the actual table-specific columns:
   * - hrm_time_tracking_owner_password_resets: id, hrm_time_tracking_owner_id, token, expired_at, used_at=null, created_at, updated_at, deleted_at=null
   * - hrm_time_tracking_manager_password_resets: id, hrm_time_tracking_manager_id, token, expired_at, consumed_at=null, created_at, updated_at, deleted_at=null
   * - hrm_time_tracking_employee_password_resets: id, hrm_time_tracking_employee_id, token, expired_at, used_at=null, created_at, updated_at
   * Ensure token uniqueness to satisfy each table's unique constraint. Use a transaction for token generation and insert so duplicate-token conflicts can be retried safely.
   *
   * If no matching account is found, do not reveal that fact in the API response. Return the same outward success shape used for matched accounts, but skip creation or apply the service's approved anti-enumeration strategy. Never expose whether the email exists in owner, manager, or employee identity tables.
   *
   * After a reset record is created, trigger the configured delivery mechanism for reset instructions. If delivery depends on an external integration and that integration fails, treat the operation as failed in accordance with the integration failure policy. Do not leave a misleading business outcome that appears delivered when it was not. If the implementation chooses to persist the reset row before attempting delivery, it must either roll back the transaction on delivery failure or mark the attempt in a way that does not falsely indicate a completed reset notification.
   *
   * Apply rate limiting, abuse detection, and idempotency protections appropriate for a public recovery endpoint. Log security-relevant events without storing raw secrets in logs. Never return token values, password hashes, or internal actor identifiers in the response.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedBody()
    body: IHrmTimeTrackingOwnerPasswordReset.ICreate,
  ): Promise<IHrmTimeTrackingOwnerPasswordReset> {
    try {
      return await postHrmTimeTrackingOwnerPasswordResets({
        owner,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Complete a password reset by validating a one-time reset token and replacing the account password for the matched HRM time tracking actor account.
   *
   * This operation supports account recovery for the HRM time tracking platform when a user is not relying on an active authenticated session. It uses the reset-token records stored in the password reset tables for employees, managers, and owners. Those tables are described as storing a unique password reset token, its expiration deadline, and whether the token has already been consumed. The operation therefore treats the submitted token as the recovery credential, locates the corresponding reset request, verifies that it is still valid for use, and then applies the new password to the linked account identity.
   *
   * The business effect of this operation is limited to account credentials. Consistent with the password maintenance requirements, changing the password keeps the same UserAccount identity, preserves the user's existing Organization memberships, does not alter the shared profile record, and does not change organization-scoped role assignments or the currently selected organization context by itself. Even though employee, manager, and owner accounts are represented separately in persistence, the API presents a unified password recovery interface because the user-facing goal is the same across all actor types.
   *
   * Security validation is central to this endpoint. The service must enforce the normal account security flow for password change recovery, reject the request when identity verification through the reset flow fails, and leave the existing password unchanged whenever validation is unsuccessful. A token that is expired, already used or consumed, missing, or not associated with the declared actor type must be rejected. The operation must not report success unless both token validation and password update complete successfully.
   *
   * This endpoint is independent from any OAuth or third-party identity process because the requirements explicitly state that no OAuth provider workflow exists for account access or organization access. It is also not an organization-scoped operation: password recovery is an account-level capability that must not expose or depend on data from any unrelated organization context.
   *
   * Clients typically use this operation after a prior password-reset request flow has issued a reset token through a separate mechanism. That issuance step is a prerequisite for this endpoint, because PATCH /password-resets is specifically the completion step that consumes an existing token and finalizes the credential update.
   *
   * @param connection
   * @param body Password reset token and new password input
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement a password reset completion workflow
     *   that accepts a JSON body containing the actor type, reset token, and
     *   new password payload.
   *
   * 1. Validate the request body shape and password policy before any database mutation.
   * 2. Resolve the actor-specific reset source by the declared actor type:
   *    - employee -> hrm_time_tracking_employee_password_resets
   *    - manager -> hrm_time_tracking_manager_password_resets
   *    - owner -> hrm_time_tracking_owner_password_resets
   * 3. Query the selected reset table by unique token. Reject if no record exists.
   * 4. Verify the reset record is still active:
   *    - employee and owner rows use used_at to indicate prior consumption
   *    - manager rows use consumed_at to indicate prior consumption
   *    - all rows must have expired_at later than the current timestamp
   *    - for manager and owner rows, if deleted_at is present, treat the row as unavailable
   * 5. Load the related actor account through the foreign key relation from the reset record. Update that account's password hash using the platform password hashing standard.
   * 6. Mark the reset record as consumed in the same transaction used for the password change. Use the correct consumption column for the selected reset table and update updated_at accordingly.
   * 7. Return a success response only after the password hash update and token-consumption update both commit successfully.
   *
   * Business rules:
   * - Do not create a new account identity; only update credentials for the existing linked actor account.
   * - Do not modify organization memberships, user profile information, employee records, role assignments, or organization context selection.
   * - Reject the operation if identity verification through the normal recovery security flow fails.
   * - Reject expired, already consumed, deleted, mismatched, or otherwise invalid tokens.
   * - Ensure the token cannot be reused after success.
   *
   * Error handling:
   * - If the token is not found, expired, already consumed, or deleted, return a validation/authorization failure and keep the password unchanged.
   * - If actor type and token do not correspond to the same reset table, return failure without probing other organization data.
   * - If password hashing or persistence fails, roll back the transaction and do not mark the reset as consumed.
   * - Because no external OAuth or identity provider is involved, do not invoke external authentication integrations for this operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async resetPassword(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedBody()
    body: IHrmTimeTrackingOwnerPasswordReset.IRequest,
  ): Promise<IHrmTimeTrackingOwnerPasswordReset> {
    try {
      return await patchHrmTimeTrackingOwnerPasswordResets({
        owner,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single password reset record by its identifier.
   *
   * This operation returns the detailed state of a one-time password reset request recorded by the HRM time tracking platform. The underlying data comes from the password reset record tables for owner, manager, or employee accounts, each of which stores the issued reset token, the expiration deadline, and whether the reset request has already been consumed. These records exist to support secure account recovery flows while preserving a historical record of issuance and usage for security review and operational auditing.
   *
   * Because password reset data is part of account-recovery security handling, access to this operation must be tightly restricted. The endpoint is intended for privileged administrative review rather than ordinary user self-service browsing. The platform requirements state that password change is a personal account operation performed by the account owner and that permissions are evaluated within the current organization context, but a password reset record itself contains sensitive recovery metadata that should not be exposed broadly. Implementations should therefore allow only appropriately privileged owner-level access and deny requests from actors without sufficient authority.
   *
   * The response should normalize records originating from hrm_time_tracking_owner_password_resets, hrm_time_tracking_manager_password_resets, and hrm_time_tracking_employee_password_resets into one consistent API shape. Although these tables differ slightly in their lifecycle columns, they all describe one-time reset requests with a unique token, an expiration timestamp, a creation timestamp, and a usage or consumption timestamp. The API documentation and DTO should reflect that this resource is a security record describing recovery-state metadata, not a direct password credential and not a substitute for the password-change workflow itself.
   *
   * This operation is commonly used together with internal account-security review capabilities. It does not perform password change, token issuance, or token consumption by itself. If a client needs to actually complete a password reset or change a password, that must be handled by separate account-recovery or password-maintenance operations. If the identifier does not match any reset record, or if the caller lacks sufficient authority, the request must fail without exposing information about unrelated accounts or records from another organization context.
   *
   * @param connection
   * @param passwordResetId Unique identifier of the password reset record
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement a read-only service that accepts
     *   passwordResetId as the primary key of a password reset record.
   *
   * Search the password reset record across the three concrete tables: hrm_time_tracking_owner_password_resets, hrm_time_tracking_manager_password_resets, and hrm_time_tracking_employee_password_resets. Because the route is generic, the service should attempt lookup by id in each table and normalize the first matching result into a unified domain object for IHrmTimeTrackingPasswordReset. The normalized response should include the record id, actor category derived from the source table, source account id, token value if the security policy allows returning it; otherwise the implementation may mask or omit the raw token in the DTO design stage if the shared schema already reflects masking. Also map expiration timestamp, creation timestamp, update timestamp when present, consumption-or-usage timestamp, and deleted timestamp when present in owner and manager reset tables.
   *
   * Before querying, authenticate the caller and enforce privileged authorization. Deny access unless the caller is an owner with permission to review account-security artifacts. Do not allow employee or manager callers to inspect arbitrary reset records. Apply organization and account-boundary checks where relevant so that the caller cannot use this endpoint to enumerate or infer security records belonging to unrelated contexts. If no record exists in any reset table, return a not-found error. If multiple records were ever theoretically matched, treat that as a data-integrity failure and reject the operation.
   *
   * Do not mutate any reset record during retrieval. This endpoint must not mark a token as used, consumed, expired, restored, or deleted. It is strictly observational. Handle nullable lifecycle fields carefully because owner and employee tables use used_at while the manager table uses consumed_at, and owner and manager tables include deleted_at while the employee table does not. Normalize these differences consistently in the response mapper.
   *
   * Log the access as a security-relevant read operation if the platform’s audit facilities are enabled. Error handling must avoid leaking whether a token or account exists beyond what the caller is authorized to know. Since no external integration is required for this read, integration-failure rules do not drive the main flow, but ordinary internal errors must still return a failure rather than partial data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":passwordResetId")
  public async at(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
  ): Promise<IHrmTimeTrackingOwnerPasswordReset> {
    try {
      return await getHrmTimeTrackingOwnerPasswordResetsPasswordResetId({
        owner,
        passwordResetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Complete a password reset request and replace the credential on the linked account.
   *
   * This operation finalizes a one-time password reset record identified by `passwordResetId`. The underlying database design stores password reset requests separately for owner, manager, and employee identities in `hrm_time_tracking_owner_password_resets`, `hrm_time_tracking_manager_password_resets`, and `hrm_time_tracking_employee_password_resets`. Each of those tables records a unique reset token, an expiration deadline, and a usage marker such as `used_at` or `consumed_at`. A successful request uses those fields to prove that the reset request is still valid, has not already been consumed, and belongs to a real actor account before the system replaces that account's `password_hash`.
   *
   * This endpoint is intended for account recovery before normal sign-in is possible, so it should be available without an authenticated organization context. Even though it is guest-accessible, it is still security-sensitive. The caller must provide the issued token together with the replacement password, and the service must reject the operation when the reset record does not exist, the supplied token does not match the stored reset token, the request is expired, the request was already consumed, or the linked owner, manager, or employee account cannot be updated. The system must not treat a failed reset as partially successful, and it must leave the existing credential unchanged when validation fails.
   *
   * The operation works against password reset resources rather than directly against actor resources. That distinction matters because the reset tables preserve the recovery workflow itself as an auditable business record, including issuance time, expiration time, and usage state. On success, the reset record is updated to reflect consumption and the linked actor account becomes able to sign in with the new password for future access. This aligns with the platform rule that password changes replace the prior credential for future sign-in while keeping the same underlying account identity and preserving existing organization memberships.
   *
   * Clients typically use this endpoint after obtaining a password reset link or token through a separate recovery initiation flow. Once the reset has been completed successfully, the same reset request should not be reused. Clients that need a fresh recovery attempt must initiate a new password reset issuance flow instead of retrying the consumed record. Error responses should clearly indicate invalid, expired, or already-consumed reset requests without exposing unnecessary information about unrelated accounts.
   *
   * @param connection
   * @param passwordResetId Target password reset request ID
   * @param body Password reset completion data including reset token and replacement password
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a transactional
     *   password reset completion workflow.
   *
   * 1. Resolve the target reset request by `passwordResetId` across the three concrete reset tables: `hrm_time_tracking_owner_password_resets`, `hrm_time_tracking_manager_password_resets`, and `hrm_time_tracking_employee_password_resets`. Exactly one matching record is expected. If none exists, return a not-found error.
   * 2. Validate the request body. Require the supplied reset token and replacement password fields defined in `IHrmTimeTrackingPasswordReset.IUpdate`. Reject when the replacement password is missing, empty, or fails any password policy enforced by the service layer.
   * 3. Compare the supplied token to the stored `token` of the resolved reset record. Reject on mismatch.
   * 4. Enforce lifecycle checks based on the concrete table schema:
   *    - owner reset: reject when `deleted_at` is not null, `used_at` is not null, or `expired_at` is in the past.
   *    - manager reset: reject when `deleted_at` is not null, `consumed_at` is not null, or `expired_at` is in the past.
   *    - employee reset: reject when `used_at` is not null or `expired_at` is in the past.
   * 5. Load the linked actor account through the reset record foreign key and confirm the actor account is still present. Update the actor table's `password_hash` with a newly hashed password. Also update account-level audit timestamps if the implementation standard requires it and the column exists on that actor table.
   * 6. Mark the reset record as consumed in the same transaction. For owner and employee reset tables, set `used_at` to the current timestamp. For manager reset tables, set `consumed_at` to the current timestamp. Update `updated_at` on the reset record.
   * 7. Commit only if both the actor credential update and reset-record consumption update succeed. If any step fails, roll back the transaction so the reset request does not appear consumed while the password remains unchanged.
   * 8. Return a unified password reset DTO representing the updated reset resource.
   *
   * Security and behavior notes:
   * - This operation must be callable without an authenticated session, but it must never bypass token validation.
   * - Do not reveal whether a different actor account exists beyond the resolved reset resource.
   * - Do not allow a consumed or expired reset request to be reused.
   * - Preserve existing memberships and organization relationships because the underlying account identity remains the same after password replacement.
   * - Because multiple actor tables exist, the service layer should centralize the resolution logic behind a password-reset service abstraction instead of duplicating controller logic per actor type.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":passwordResetId")
  public async update(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingOwnerPasswordReset.IUpdate,
  ): Promise<IHrmTimeTrackingOwnerPasswordReset> {
    try {
      return await putHrmTimeTrackingOwnerPasswordResetsPasswordResetId({
        owner,
        passwordResetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently remove a specific password reset request record.
   *
   * This operation deletes one issued password reset request identified by `passwordResetId`. In the hrmTimeTracking platform, password reset records are one-time recovery artifacts attached to a specific actor account and store reset token lifecycle data such as token issuance, expiration, and whether the token has already been used or consumed. The underlying database models show this structure for owner, manager, and employee password reset records through the `hrm_time_tracking_owner_password_resets`, `hrm_time_tracking_manager_password_resets`, and `hrm_time_tracking_employee_password_resets` tables, each using a UUID primary key and a unique `token` field.
   *
   * Access to this operation must be constrained to the authenticated actor who owns the targeted reset request within the corresponding actor account type. This restriction is important because password reset records are security-sensitive recovery artifacts. The operation must not expose or return token values, and it must not be used as a substitute for password change, account deletion, or organization deletion workflows. Those flows are defined separately in the requirements and have distinct business consequences such as account credential updates or employee deactivation in other organizations.
   *
   * From a data perspective, this operation affects only the password reset request row itself. The reset record belongs to exactly one actor account through `hrm_time_tracking_owner_id`, `hrm_time_tracking_manager_id`, or `hrm_time_tracking_employee_id`, depending on the concrete table being targeted. Deleting the reset request does not change the actor account, organization memberships, shared profile data, employee records, or any organization history preserved by account lifecycle rules. It only removes the selected recovery request from future use.
   *
   * Clients should call this endpoint when they need to invalidate and remove a specific stored password reset request after it is no longer needed, such as after explicit cancellation or security cleanup by the owning user. If clients need to continue account recovery, they should create or use a separate password reset issuance flow rather than depending on this deletion endpoint. If the specified record does not exist, does not belong to the authenticated actor, or is not accessible under the current security context, the request must be rejected without disclosing sensitive ownership details.
   *
   * @param connection
   * @param passwordResetId Unique identifier of the password reset request to remove.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor owner
     * @x-autobe-specification Implement this operation as a security-sensitive
     *   single-record deletion for password reset artifacts.
   *
   * 1. Authenticate the caller and determine the actor category from the authenticated session context: owner, manager, or employee.
   * 2. Resolve the backing table exclusively from that actor category:
   *    - owner -> hrm_time_tracking_owner_password_resets
   *    - manager -> hrm_time_tracking_manager_password_resets
   *    - employee -> hrm_time_tracking_employee_password_resets
   *    Do not query across all three tables in a way that could reveal cross-actor record existence.
   * 3. Validate that `passwordResetId` is a UUID-shaped identifier before querying.
   * 4. Load the target reset record by primary key from the resolved table and verify ownership by matching the related foreign key column against the authenticated actor account id:
   *    - owner: hrm_time_tracking_owner_id
   *    - manager: hrm_time_tracking_manager_id
   *    - employee: hrm_time_tracking_employee_id
   * 5. If no matching record is found for the authenticated actor in the resolved table, reject the request as not found or forbidden according to the service's standard security policy, without revealing whether the id exists for another actor type.
   * 6. Permanently delete the matched row. Do not mutate the associated actor account. Do not change password credentials, sessions, memberships, employee records, or organization data.
   * 7. Return success with no response body.
   *
   * Implementation notes:
   * - This operation is a hard delete because the employee reset table has no `deleted_at` column and the requirements provide no unified deactivation rule for password reset requests.
   * - Owner and manager reset tables include `deleted_at`, but this endpoint should still remove the row permanently to keep behavior consistent across actor-specific reset resources unless a separate archival policy is later specified.
   * - No transaction spanning other domain entities is required because only one reset record is affected.
   * - Log the security event through the platform's operational logging facilities if such infrastructure exists, but do not persist or return raw token values in application logs or API responses.
   * - Treat already used or already expired reset requests as still deletable if ownership is satisfied, since deletion is cleanup of the reset artifact rather than execution of the reset flow.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":passwordResetId")
  public async erase(
    @OwnerAuth()
    owner: OwnerPayload,
    @TypedParam("passwordResetId")
    passwordResetId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteHrmTimeTrackingOwnerPasswordResetsPasswordResetId({
        owner,
        passwordResetId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
