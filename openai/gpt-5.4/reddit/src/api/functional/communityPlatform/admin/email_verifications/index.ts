import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformMember } from "../../../../structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberEmailVerification } from "../../../../structures/ICommunityPlatformMemberEmailVerification";
import { IPageICommunityPlatformMemberEmailVerification } from "../../../../structures/IPageICommunityPlatformMemberEmailVerification";

/**
 * Create a new member registration request and issue an email verification record for the submitted email address.
 *
 * This operation supports the guest registration flow of the community platform. A guest provides an email address, password, and username so the system can establish a new member identity. The resulting member account is stored in the canonical member table, `community_platform_members`, which holds the credential-bearing account attributes and account-level security state for registered users. As part of the same flow, the system creates a related record in `community_platform_member_email_verifications`, which preserves the lifecycle of the issued verification token including its current status, expiration time, invalidation state, and eventual verification timestamp.
 *
 * This is a guest-facing creation operation. It must reject attempts that omit the required registration information, and it must reject attempts that reuse an email address already tied to another member account or a username already in use by another user account according to the loaded requirements. The member record must begin with an unverified email state at the account level until the verification process is completed through the separate confirmation flow. If the caller is already acting as an authenticated member, this endpoint should not be used to obtain another authenticated state for the same account lifecycle.
 *
 * From a data perspective, this operation writes a new root identity record into `community_platform_members` and a new child verification record into `community_platform_member_email_verifications`. The member table defines `email` as unique, stores `password_hash` rather than plain text credentials, and tracks `email_verified`, `status`, `created_at`, and `updated_at`. The verification table defines a unique `token`, stores a lifecycle `status`, and tracks `expired_at`, `invalidated_at`, `verified_at`, `created_at`, and `updated_at`. These schema details mean the implementation must generate a unique member code and unique verification token, hash the submitted password before persistence, initialize verification status consistently, and ensure both records are created together.
 *
 * Clients typically use this operation before any member-only participation features become available. After successful registration, clients should direct the user to the email verification completion experience rather than assuming the account is already verified for all platform capabilities. Error handling should clearly distinguish duplicate email, duplicate username, missing required fields, and any failure to issue a valid verification record. If member creation or verification issuance cannot be completed atomically, the operation must fail without leaving a partially registered account visible as a successful outcome.
 *
 * @param props.connection
 * @param props.body Registration information for creating a member account and issuing email verification
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement this operation as an atomic registration transaction.
 *
 * 1. Authorize the caller as a guest-oriented public operation. If the runtime identifies the caller as an already authenticated member attempting to re-register within the same account context, reject the request according to the registration rules.
 * 2. Validate that the request body contains email, password, and username. Reject when any required field is missing or empty according to service validation standards.
 * 3. Query `community_platform_members` to check for an existing row with the submitted email. Reject if found because `email` is unique and duplicate sign-up by email is forbidden.
 * 4. Check username uniqueness against the platform user identity source used by the registration flow. If username is stored outside `community_platform_members`, delegate that check to the corresponding account/profile identity service. Reject if the username is already in use.
 * 5. Generate a new member UUID, a unique member `code`, and hash the submitted password into `password_hash`.
 * 6. Insert a new row into `community_platform_members` with: generated `id`, generated `code`, submitted `email`, hashed password, `email_verified = false`, an initial active or pending account `status` consistent with the domain policy, `last_signed_in_at = null`, and current timestamps for `created_at` and `updated_at`. Do not set `deleted_at`.
 * 7. Generate a unique verification token and expiration timestamp. Insert a related row into `community_platform_member_email_verifications` with generated UUID, `community_platform_member_id` referencing the new member, the unique `token`, an initial pending verification `status`, `verified_at = null`, computed `expired_at`, `invalidated_at = null`, current timestamps for `created_at` and `updated_at`, and `deleted_at = null`.
 * 8. Commit only if both inserts succeed. On any failure, roll back the transaction so no partial registration remains.
 * 9. After commit, trigger the outbound delivery mechanism that sends the verification token to the submitted email address. If delivery is handled asynchronously, ensure the persisted verification record is available to the mail job. If the system requires synchronous delivery confirmation, convert delivery failure into an operation failure with compensating rollback or explicit invalidation according to infrastructure capability.
 * 10. Return the created member resource. The returned DTO should expose account identity and verification state appropriate for API consumers, but never expose `password_hash` or raw verification tokens.
 *
 * Edge cases: handle unique constraint races on `email` and generated `token` by catching database constraint violations and converting them to deterministic conflict errors; retry token/code generation when uniqueness collisions occur. Do not create profile records here unless another loaded requirement explicitly mandates profile creation during sign-up. Do not create a login session in this operation.
 * @path /communityPlatform/admin/email-verifications
 * @accessor api.functional.communityPlatform.admin.email_verifications.create
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
     * Registration information for creating a member account and issuing email verification
     */
    body: ICommunityPlatformMemberEmailVerification.ICreate;
  };
  export type Body = ICommunityPlatformMemberEmailVerification.ICreate;
  export type Response = ICommunityPlatformMember;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/admin/email-verifications",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/admin/email-verifications";
  export const random = (): ICommunityPlatformMember =>
    typia.random<ICommunityPlatformMember>();
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
 * Retrieve a filtered and paginated list of email verification records for the authenticated member account.
 *
 * This operation exposes the verification history stored in community_platform_member_email_verifications, the table that records issued verification tokens used for member registration, address confirmation, and repeated re-verification flows. Each record represents one verification attempt and its lifecycle state, including when it was issued, when it expires, whether it was completed, and whether it was invalidated. The endpoint allows a member to inspect verification progress and history without denormalizing parent member identity data into each result.
 *
 * Access to this operation must be restricted to an authenticated member viewing records that belong to that same member account. The underlying records are linked to community_platform_members through community_platform_member_id, and the parent member table is the canonical authenticated identity for the platform. The implementation must therefore scope every query to the signed-in member and must not return verification records belonging to any other member. This ownership boundary is consistent with the account model in which the member account holds the login email address, the account-level email_verified flag, and the overall account status.
 *
 * From a business perspective, this operation supports the registration and account-verification lifecycle described in the requirements. Guests may register using email, password, and username, while duplicate or missing account information causes rejection. After account creation, email verification history becomes part of the member’s account security visibility. This endpoint can be used together with registration and future re-verification flows to help the member understand whether a token is still pending, already verified, expired, or invalidated.
 *
 * The response should focus on browsing and operational visibility rather than mutation. Clients may filter by verification status and relevant timestamps such as created_at, expired_at, verified_at, or invalidated_at, and may request pagination and sorting for long histories. If no records match the filter, the operation should return an empty page result rather than failing. If the caller is not authenticated as a member, the operation must be rejected according to member-only access rules.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting options for email verification records
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement this operation as a member-scoped query over community_platform_member_email_verifications.
 *
 * Resolve the authenticated member identity from the session context, then query community_platform_member_email_verifications where community_platform_member_id matches the authenticated member's community_platform_members.id. Exclude records with deleted_at set unless the request DTO explicitly supports privileged historical inclusion and such inclusion is authorized; by default, only active application-visible records should be returned. Join or correlate with community_platform_members only when needed to validate ownership or enrich response fields that are explicitly defined in the DTO schema.
 *
 * Accept a request body of type ICommunityPlatformMemberEmailVerification.IRequest containing pagination, sorting, and optional filters such as status, createdAt range, expiredAt range, verifiedAt range, and invalidatedAt presence or range. Apply stable sorting, defaulting to newest created_at first when the request does not specify an order. Return a paginated response of type IPageICommunityPlatformMemberEmailVerification.ISummary.
 *
 * Validate that the caller is authenticated as a member before executing the query. Do not allow clients to supply or override community_platform_member_id in the request body because ownership scope must come from authentication context. If authentication is missing, reject the request. If the member account is unavailable or not in a usable state, reject according to service-wide authorization and account-state policies. When filters yield no results, return an empty page payload with valid pagination metadata.
 *
 * Keep the operation read-only. Do not create, update, verify, invalidate, or remove verification records here. Those lifecycle transitions belong to dedicated security workflows that issue tokens and mark them verified, expired, or invalidated. This endpoint only lists existing verification records for account security visibility and troubleshooting.
 * @path /communityPlatform/admin/email-verifications
 * @accessor api.functional.communityPlatform.admin.email_verifications.index
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
     * Search criteria, pagination, and sorting options for email verification records
     */
    body: ICommunityPlatformMemberEmailVerification.IRequest;
  };
  export type Body = ICommunityPlatformMemberEmailVerification.IRequest;
  export type Response =
    IPageICommunityPlatformMemberEmailVerification.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/admin/email-verifications",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/admin/email-verifications";
  export const random =
    (): IPageICommunityPlatformMemberEmailVerification.ISummary =>
      typia.random<IPageICommunityPlatformMemberEmailVerification.ISummary>();
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
 * Retrieve the detailed state of a specific member email verification record.
 *
 * This operation returns one verification record from the member email verification store that supports member registration, address confirmation, and repeated re-verification flows. The underlying table preserves the lifecycle of an issued verification token, including its current status, issuance time, expiration time, verification completion time, and any invalidation time. As documented by the schema, each record belongs to exactly one member account through community_platform_member_id and is identified by a UUID primary key.
 *
 * This endpoint exposes security-sensitive account verification information and therefore must not be available to guests. A signed-in member may use it only for a verification record that belongs to that same member account. An admin may retrieve the record for operational review or support workflows. The operation must enforce ownership or elevated administrative authority before returning any data, because the record contains token-related verification state tied to account identity confirmation.
 *
 * The returned resource reflects the lifecycle fields stored in community_platform_member_email_verifications: token, status, verified_at, expired_at, invalidated_at, created_at, updated_at, and deleted_at. These columns collectively describe whether the verification is pending, completed, expired, or invalidated, and when those transitions occurred. Because the table is described as preserving verification history for account security auditing and operational troubleshooting, this operation is suitable for detailed inspection of a single verification event rather than general browsing.
 *
 * This operation is related to account registration and email confirmation workflows. It may be used after account creation or after an email verification issuance event to inspect the resulting verification record and determine whether the address has been confirmed, whether the token has expired, or whether it was invalidated before use. If the requested record does not exist, does not belong to the requesting member, or is not visible under active application rules, the operation must reject the request rather than exposing verification metadata.
 *
 * @param props.connection
 * @param props.emailVerificationId Target email verification record ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a read-only service that loads one row from community_platform_member_email_verifications by its primary key id.
 *
 * Validate the emailVerificationId path parameter as a UUID. Query the verification record by id. Enforce visibility rules before returning data: guests are not authorized; a member caller may retrieve the record only when community_platform_member_id maps to the authenticated member identity; an admin caller may retrieve any record if platform policy allows administrative oversight. If no matching row exists, return a not-found error. If the row exists but the caller is not permitted to access it, return a forbidden error without disclosing additional ownership details.
 *
 * When reading the record, treat this table as a subsidiary security-related history entity. Include the lifecycle columns exactly as stored: token, status, verified_at, expired_at, invalidated_at, created_at, updated_at, and deleted_at. Because the schema comment states that deleted_at removes the record from active application visibility, the default implementation should exclude rows with deleted_at set unless an internal administrative visibility policy explicitly requires otherwise. Do not mutate any state in this operation.
 *
 * Map the row to ICommunityPlatformMemberEmailVerification. The service should not infer additional status values beyond the persisted status column. It should simply return the current persisted state and timestamps so downstream clients can determine whether the verification is pending, verified, expired, or invalidated. Log access through standard audit mechanisms for account-security data if such infrastructure exists, but do not change the verification record during retrieval.
 * @path /communityPlatform/admin/email-verifications/:emailVerificationId
 * @accessor api.functional.communityPlatform.admin.email_verifications.at
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
     * Target email verification record ID
     */
    emailVerificationId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformMemberEmailVerification;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/admin/email-verifications/:emailVerificationId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/email-verifications/${encodeURIComponent(props.emailVerificationId ?? "null")}`;
  export const random = (): ICommunityPlatformMemberEmailVerification =>
    typia.random<ICommunityPlatformMemberEmailVerification>();
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
      assert.param("emailVerificationId")(() =>
        typia.assert(props.emailVerificationId),
      );
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
 * Update a specific member email verification record.
 *
 * This operation manages the lifecycle state of an existing email verification record stored in the community_platform_member_email_verifications table, which is described as preserving verification records for member registration, address confirmation, and repeated re-verification flows. The target record is identified by its primary key and belongs to a single member account through community_platform_member_id. The update is intended for controlled state progression of a previously issued verification token, including fields such as status, verified_at, invalidated_at, and other lifecycle-related values that determine whether the verification is pending, verified, expired, or invalidated.
 *
 * The operation is intended for authenticated member-context workflows that need to finalize or revise the state of a verification attempt associated with an existing member account. Because the table keeps verification history for account security auditing and operational troubleshooting, implementations must preserve the integrity of the historical record and avoid arbitrary reassignment of ownership. The linked member identity must remain consistent with the original verification record, and the operation must not be used as a substitute for login, signup, logout, or session issuance.
 *
 * From a data perspective, this endpoint works directly with the community_platform_member_email_verifications entity, whose schema includes a unique token, a lifecycle status, optional verified_at and invalidated_at timestamps, a required expired_at timestamp, and audit timestamps such as created_at and updated_at. Implementations should validate requested lifecycle changes against the current record state so that a record already completed or no longer valid is not transitioned into an inconsistent condition. If the requested verification record does not exist, has been removed from active visibility, or cannot legally transition to the requested state, the request must be rejected.
 *
 * This operation is commonly related to account registration and address confirmation flows. A client typically reaches this endpoint only after a verification record has already been issued by a preceding registration or re-verification process and the caller has the target verification identifier. After a successful update, clients can use the returned resource to inspect the current verification status and timestamps for subsequent user experience decisions, such as confirming that the member's email address has been verified or that the token is no longer usable.
 *
 * @param props.connection
 * @param props.emailVerificationId Target email verification record ID
 * @param props.body Changes to the member email verification lifecycle record
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Load the target community_platform_member_email_verifications row by id where deleted_at is null.
 *
 * Validate that the caller is operating within an authorized member context for the owning community_platform_member_id, or through an internal application path that is allowed to finalize verification state. Reject the request if the record does not exist, is not visible, or belongs to a different member identity than the caller is allowed to affect.
 *
 * Apply update logic as a lifecycle-state transition, not as a free-form overwrite. Accept only fields defined by ICommunityPlatformMemberEmailVerification.IUpdate. Preserve immutable identity and issuance history semantics. Do not reassign community_platform_member_id to a different member. Do not mutate token uniqueness in a way that conflicts with the unique constraint. If status is transitioned to verified, set verified_at consistently and ensure the record is not expired, invalidated, or already logically removed. If status is transitioned to invalidated, set invalidated_at consistently. If the current time is later than expired_at, reject transitions that would newly mark the record as successfully verified unless the business service explicitly allows a recovery path.
 *
 * Update updated_at during the write. Execute the state validation and persistence in a single transaction to avoid race conditions between concurrent verification actions. Return the refreshed verification record after persistence.
 *
 * Error handling should cover: missing target record, deleted or unavailable record, unauthorized access, illegal lifecycle transition, unique constraint conflicts if token mutation is attempted by the DTO, and expired verification state that prevents successful completion.
 * @path /communityPlatform/admin/email-verifications/:emailVerificationId
 * @accessor api.functional.communityPlatform.admin.email_verifications.update
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
     * Target email verification record ID
     */
    emailVerificationId: string & tags.Format<"uuid">;

    /**
     * Changes to the member email verification lifecycle record
     */
    body: ICommunityPlatformMemberEmailVerification.IUpdate;
  };
  export type Body = ICommunityPlatformMemberEmailVerification.IUpdate;
  export type Response = ICommunityPlatformMemberEmailVerification;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/admin/email-verifications/:emailVerificationId",
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
    `/communityPlatform/admin/email-verifications/${encodeURIComponent(props.emailVerificationId ?? "null")}`;
  export const random = (): ICommunityPlatformMemberEmailVerification =>
    typia.random<ICommunityPlatformMemberEmailVerification>();
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
      assert.param("emailVerificationId")(() =>
        typia.assert(props.emailVerificationId),
      );
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
 * Permanently remove a specific email verification record identified by its unique ID.
 *
 * This operation deletes one email verification resource from active application use. The underlying verification entities represent time-bound verification tokens issued to prove email ownership for either registered members or administrator accounts. In the database, these records preserve the lifecycle of a verification attempt through fields such as token, status, verified_at, expired_at, created_at, and updated_at. Deleting a record through this endpoint ends access to that specific verification item and prevents it from remaining available as an active verification artifact.
 *
 * The operation is intended for authenticated account-management or privileged administrative contexts only. Guests must not be allowed to call it. The service must verify that the caller is authorized to remove the targeted verification record within the caller's own account scope or other legitimate authority scope. A caller must never be able to remove a verification record belonging to an unrelated member or administrator account.
 *
 * This endpoint relates directly to the community_platform_member_email_verifications table, which stores issued member verification tokens and their lifecycle state, and to the community_platform_admin_email_verifications table, which stores equivalent records for administrator email ownership confirmation. Both schemas describe a verification record as a historical issuance attempt rather than a durable profile attribute. Because of that lifecycle-oriented nature, deletion should target the specific verification record only and must not alter unrelated account data beyond what is necessary to remove the record.
 *
 * Validation must confirm that the supplied emailVerificationId resolves to an existing verification record. If no matching record exists, the request must be rejected. If the record exists but does not belong to the caller's authorized scope, the request must also be rejected. The operation should not require any request body because the resource identifier in the path is sufficient to locate the target.
 *
 * This operation may be used together with email verification creation or lookup flows that issue and inspect verification records. A client would typically obtain the target identifier from a prior account-management or verification-record retrieval workflow before invoking this endpoint. After successful deletion, subsequent attempts to act on that same verification record should fail because the resource is no longer available as an active record.
 *
 * @param props.connection
 * @param props.emailVerificationId Unique ID of the target email verification record.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement a service-layer deletion routine for a single email verification record by UUID.
 *
 * 1. Accept emailVerificationId from the path and validate it as a UUID.
 * 2. Resolve the target verification record from the applicable verification storage. Because the loaded schema context includes both community_platform_member_email_verifications and community_platform_admin_email_verifications, the service must determine which verification domain the route is operating against in the actual application composition, or query the appropriate table according to authenticated actor context.
 * 3. If no record exists for the supplied identifier, raise a not-found error.
 * 4. Authorize the request before deletion. For member-context usage, ensure the verification record belongs to the authenticated member account. For administrator-context usage, ensure the caller has legitimate authority over the targeted administrator verification record. Reject any cross-account or unrelated deletion attempt.
 * 5. Remove the targeted record within a transaction-safe unit of work. Do not modify unrelated verification history records. Do not require or process a request body.
 * 6. Return successful completion with no response payload.
 *
 * Error handling requirements:
 * - Reject malformed identifiers before database execution.
 * - Reject requests for non-existent records.
 * - Reject requests outside the caller's authorization scope.
 * - Ensure repeated deletion attempts against an already removed record result in a not-found style failure rather than silent success.
 *
 * Implementation notes:
 * - Use the primary key lookup path because both loaded verification schemas use id as the UUID primary key.
 * - Keep the operation narrowly scoped to deleting the verification record itself; do not change member, administrator, or session state unless separately required by other business logic outside this endpoint.
 * - If the implementation layer uses logical retirement based on deleted_at, it must still present the endpoint behavior as resource removal and exclude retired records from subsequent active reads.
 * @path /communityPlatform/admin/email-verifications/:emailVerificationId
 * @accessor api.functional.communityPlatform.admin.email_verifications.erase
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
     * Unique ID of the target email verification record.
     */
    emailVerificationId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/admin/email-verifications/:emailVerificationId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/admin/email-verifications/${encodeURIComponent(props.emailVerificationId ?? "null")}`;
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
      assert.param("emailVerificationId")(() =>
        typia.assert(props.emailVerificationId),
      );
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
