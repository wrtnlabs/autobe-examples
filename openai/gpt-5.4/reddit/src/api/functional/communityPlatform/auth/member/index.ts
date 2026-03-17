import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { ICommunityPlatformMember } from "../../../../structures/ICommunityPlatformMember";

/**
 * This operation registers a new member account for the community platform and immediately establishes an authenticated session for that newly created account. The underlying actor record is community_platform_members, described as the canonical authenticated identity for registered platform members, storing credential-bearing account attributes and account-level security state. In that table, the email column is the unique login identifier and contact address, while password_hash stores the hashed credential used for member authentication. The account is created with its email_verified state set at the account level and with a lifecycle status appropriate for a newly registered member.
 *
 * The operation creates the authenticated identity needed for later access to member-only areas described in the requirements, where a member is an authenticated account holder who can access the Home Feed and participate in communities through subscriptions, posts, comments, voting, and reporting. Registration is therefore the entry point into the broader member journey, but this endpoint remains focused only on authorization-state creation rather than profile setup or community actions.
 *
 * This endpoint is also tightly connected to the normalized security support tables. After creating the member root identity, the service should issue a record in community_platform_member_email_verifications, which is documented as storing verification records that support member registration, address confirmation, and repeated re-verification flows. That verification record includes a token and lifecycle fields such as status, expired_at, verified_at, and invalidated_at. The endpoint should also establish the first authenticated continuity record in community_platform_member_sessions, whose purpose is to capture token-based authentication continuity with connection metadata such as ip, href, referrer, and expiration timing.
 *
 * Validation must reflect both schema facts and requirement errors. The member table has a unique email constraint, so duplicate email registration must be rejected. The requirements also state that registration may fail for duplicate or missing account information. Because the loaded actor schema does not confirm a separate username column, this operation must not claim to create or validate one here even though broader user-domain analysis mentions a public username concept. Authorization documentation for this endpoint should remain faithful to confirmed member-schema fields and the exact DTO contract provided for registration.
 *
 * Clients commonly use this operation before any member-only API. After successful completion, the returned ICommunityPlatformMember.IAuthorized response should be used with authenticated endpoints and later with POST /auth/member/refresh when token renewal is needed. If the platform requires confirmed email before certain protected capabilities, the client should next invoke the email verification flow to reconcile the email_verified account flag with the token lifecycle recorded in community_platform_member_email_verifications.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Member registration payload for creating a new authenticated account.
 * @x-autobe-authorization-type join
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement member registration by validating the incoming join payload against uniqueness and account lifecycle rules before any write occurs. Check community_platform_members for an existing non-deleted or still-reserved account with the same email, because the table enforces unique email identity and the requirements define registration rejection for duplicate account information. Create a new member row with a new UUID primary key, a generated unique code, the provided email, a securely hashed password stored in password_hash, email_verified initialized to false, status initialized to an active registration state, last_signed_in_at null, and current timestamps.
 *
 * Within the same transaction, create an initial community_platform_member_email_verifications row for the new member using a unique verification token, status pending, created_at now, expired_at based on the platform verification lifetime, and null values for verified_at and invalidated_at. After transaction commit, issue JWT access and refresh tokens and create a community_platform_member_sessions record containing the new session id, community_platform_member_id, request ip, href, referrer, created_at, and expired_at aligned with refresh-session lifetime.
 *
 * Reject requests when the email is duplicated, required account information is missing, or the member record cannot be created consistently with its verification and session children. Do not assume a separate username column because the loaded member schema does not confirm one. Update auditing timestamps consistently and return the authorized token envelope defined by ICommunityPlatformMember.IAuthorized.
 * @path /communityPlatform/auth/member/join
 * @accessor api.functional.communityPlatform.auth.member.join
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function join(
  connection: IConnection,
  props: join.Props,
): Promise<join.Response> {
  const output: join.Response =
    true === connection.simulate
      ? join.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...join.METADATA,
            path: join.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace join {
  export type Props = {
    /**
     * Member registration payload for creating a new authenticated account.
     */
    body: ICommunityPlatformMember.IJoin;
  };
  export type Body = ICommunityPlatformMember.IJoin;
  export type Response = ICommunityPlatformMember.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/auth/member/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/auth/member/join";
  export const random = (): ICommunityPlatformMember.IAuthorized =>
    typia.random<ICommunityPlatformMember.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: join.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: join.path(),
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
 * This operation authenticates an existing registered member and issues a new authorized token set for continued use of member-only platform capabilities. The canonical backing table is community_platform_members, which stores the unique email address used as the member's login identifier and the password_hash used for member authentication. The same table also stores account-level security state such as status, email_verified, and last_signed_in_at, all of which are relevant to a secure sign-in decision.
 *
 * The requirements define a member as a user with an authenticated account who is logged in to the platform. Logging in transitions a person into authenticated participation, enabling member-only areas and community participation workflows. This endpoint therefore sits at the security boundary for authenticated access, but it does not itself grant any special moderation or administrative authority. It only establishes the member identity required for subsequent authorized operations elsewhere in the API surface.
 *
 * The session continuity side of login is backed by community_platform_member_sessions, described as authenticated session records for registered platform members. That table stores connection context present at session creation time, including ip, href, referrer, created_at, and expired_at. A successful login should therefore not only validate credentials but also create one session record that becomes the server-tracked anchor for refresh-token renewal logic and session history.
 *
 * Error handling must align with both the requirements and schema. The requirements explicitly list login failure for invalid credentials. The schema additionally exposes account status and deletion-state timing, so sign-in must take account lifecycle usability into consideration before issuing tokens. If the account is not found, if the password is incorrect, or if the account status disallows authentication, the endpoint must fail without mutating last_signed_in_at or creating any community_platform_member_sessions row.
 *
 * This endpoint is typically paired with POST /auth/member/refresh. The login operation establishes the initial authenticated session for an existing account, while the refresh operation renews authorization continuity for a still-valid session. If the member has not yet confirmed email ownership, clients may also need to continue with the verification flow supported by community_platform_member_email_verifications and reflected at the account level by community_platform_members.email_verified.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Member credential payload for authenticating an existing account.
 * @x-autobe-authorization-type login
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement member login by locating the target account in community_platform_members using the supported login identifier from the loaded schema, which is email. Exclude rows in unusable lifecycle states according to business rules, such as deleted or suspended status when those states block sign-in. Verify the supplied password against password_hash using the platform password hashing strategy. On success, update last_signed_in_at to the current timestamp.
 *
 * Create a new community_platform_member_sessions record to represent the newly issued authenticated session. Persist the new session with a generated id, the member foreign key, request-origin metadata ip, href, referrer, created_at now, and expired_at set to the refresh lifetime. Then issue a fresh JWT access token and refresh token bound to the session and member identity. The response must use ICommunityPlatformMember.IAuthorized exactly.
 *
 * Reject login when the email does not resolve to an eligible member, when the password comparison fails, or when account status blocks sign-in. Preserve indistinguishable credential failure behavior where appropriate for security. Do not create a session if credential validation fails. Ensure session creation and audit updates are consistent and atomic enough to avoid a valid token without persisted session state.
 * @path /communityPlatform/auth/member/login
 * @accessor api.functional.communityPlatform.auth.member.login
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function login(
  connection: IConnection,
  props: login.Props,
): Promise<login.Response> {
  const output: login.Response =
    true === connection.simulate
      ? login.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...login.METADATA,
            path: login.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace login {
  export type Props = {
    /**
     * Member credential payload for authenticating an existing account.
     */
    body: ICommunityPlatformMember.ILogin;
  };
  export type Body = ICommunityPlatformMember.ILogin;
  export type Response = ICommunityPlatformMember.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/auth/member/login",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/auth/member/login";
  export const random = (): ICommunityPlatformMember.IAuthorized =>
    typia.random<ICommunityPlatformMember.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: login.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: login.path(),
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
 * This operation renews an existing member authorization context without requiring the client to resubmit primary credentials such as email and password. It is backed by community_platform_member_sessions, the table documented as storing token-based authentication continuity, session history, and expiration timing for registered platform members. The session record belongs to exactly one community_platform_members account and captures the connection context used when the session was established.
 *
 * The purpose of refresh is to preserve secure continuity for a valid signed-in member while respecting expiration controls. The session table's expired_at field is the key schema-backed indicator that a session becomes invalid unless renewed or replaced by authentication flows. The member root table, community_platform_members, also remains relevant because authorization continuity should stop if the member account enters a non-usable lifecycle status such as suspension or deletion tracking before purge.
 *
 * This endpoint is driven by the refresh credential supplied in the request body and is classified under authorizationType refresh. It is still a security-sensitive operation because it issues a fresh authorized envelope and must rigorously validate persisted session state before doing so.
 *
 * The endpoint depends on the existence of a previously established session created by either member registration or member login. In normal client workflow, POST /auth/member/join or POST /auth/member/login is called first to obtain the initial authorized tokens. Thereafter, POST /auth/member/refresh is used before or after access-token expiry, subject to refresh-token validity and session expiration. If the persisted session cannot be validated, the client must return to a primary authentication flow rather than silently re-establishing authorization.
 *
 * Expected failures include malformed refresh input, unknown session linkage, expired session timing, and member accounts that are no longer eligible for continued sign-in. In all such cases, the service must return an authentication failure and avoid minting any new authorization tokens.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Refresh-token payload for renewing an existing member authorization session.
 * @x-autobe-authorization-type refresh
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement token refresh by validating the incoming refresh token payload against the persisted session state in community_platform_member_sessions. Resolve the referenced session and owning member, confirm the session has not expired based on expired_at, and confirm the member account remains in a sign-in-eligible state in community_platform_members. If the platform rotates refresh sessions, create a replacement session row and expire or supersede the previous token context according to service policy; otherwise extend continuity using the same persisted session and new JWT issuance.
 *
 * When a refresh succeeds, return a fresh ICommunityPlatformMember.IAuthorized payload. If rotation is used, ensure the database state and token issuance are consistent so a client cannot receive tokens bound to a non-existent session. Optionally update contextual audit metadata if policy requires a refreshed session timestamp trail. No authentication prerequisite should be declared because the refresh token itself is the credential for this flow.
 *
 * Reject the request when the refresh token is malformed, when the session cannot be found, when the session is expired, or when the owning member account status no longer permits authorization continuation. Never create a new session for an invalid or expired refresh request.
 * @path /communityPlatform/auth/member/refresh
 * @accessor api.functional.communityPlatform.auth.member.refresh
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function refresh(
  connection: IConnection,
  props: refresh.Props,
): Promise<refresh.Response> {
  const output: refresh.Response =
    true === connection.simulate
      ? refresh.simulate(connection, props)
      : await PlainFetcher.fetch(
          {
            ...connection,
            headers: {
              ...connection.headers,
              "Content-Type": "application/json",
            },
          },
          {
            ...refresh.METADATA,
            path: refresh.path(),
            status: null,
          },
          props.body,
        );
  connection.headers ??= {};
  connection.headers.Authorization = output.token.access;
  return output;
}
export namespace refresh {
  export type Props = {
    /**
     * Refresh-token payload for renewing an existing member authorization session.
     */
    body: ICommunityPlatformMember.IRefresh;
  };
  export type Body = ICommunityPlatformMember.IRefresh;
  export type Response = ICommunityPlatformMember.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/auth/member/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/auth/member/refresh";
  export const random = (): ICommunityPlatformMember.IAuthorized =>
    typia.random<ICommunityPlatformMember.IAuthorized>();
  export const simulate = (
    connection: IConnection,
    props: refresh.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: refresh.path(),
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
