import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { ICommunityPlatformMemberuser } from "../../../structures/ICommunityPlatformMemberuser";

/**
 * Register a new memberUser using community_platform_memberusers and return
 * ICommunityPlatformMemberUser.IAuthorized with initial tokens.
 *
 * Registers a new member user account in the community platform using the
 * community_platform_memberusers table and returns an authorization envelope
 * that includes initial JWT tokens.
 *
 * This operation writes a new row into community_platform_memberusers,
 * populating the mandatory identity and credential columns username, email, and
 * password_hash. The password is never stored in plain text; instead the
 * service hashes the provided password from the request body and persists it to
 * the password_hash column as described in the schema comment. It also
 * initializes created_at and updated_at with the current timestamp and leaves
 * deleted_at as null to indicate an active, non-deleted account. The
 * account_status_id foreign key is set to an appropriate status row from
 * community_platform_account_statuses, such as the entry whose key represents
 * an active or pending verification state, tying the new member to its
 * lifecycle status definition.
 *
 * From a security perspective, this endpoint is public (authorizationActor is
 * null) but still critical. It must enforce uniqueness constraints aligned with
 * the uniqueIndexes on username and email, returning appropriate error
 * responses when a conflicting username or email already exists. In addition,
 * it must follow password policy guidance from the requirements, rejecting weak
 * passwords before attempting to hash and store them in password_hash. All
 * validation and error reporting should be designed so that it does not leak
 * sensitive information about existing accounts beyond what is acceptable in
 * the platform's security model.
 *
 * The join operation is tightly integrated with session management and security
 * event tracking. Upon successfully writing the member record, the service must
 * create a corresponding session row in community_platform_memberuser_sessions,
 * populating community_platform_memberuser_id to reference the new member user,
 * along with ip, href, referrer, created_at, and an initial expired_at null
 * value to represent an active session. In parallel, it records a security
 * event row in community_platform_user_security_events with actor_type set to
 * "memberuser", an event_type such as "join_success", and any contextual
 * details captured in metadata_json. If the platform wishes to store a
 * resulting account_status_id transition, that foreign key can be used to
 * highlight the status associated with this security-relevant event.
 *
 * The endpoint fits into the overall authentication workflow together with the
 * login and refresh endpoints for memberUser. After this join operation is
 * called, typical clients will next call the login endpoint only when
 * necessary; however, in many flows the join endpoint will directly mint an
 * access token and refresh token pair, so the user is effectively logged in
 * immediately. The response body uses the
 * ICommunityPlatformMemberUser.IAuthorized DTO, which encapsulates the issued
 * tokens, selected member user profile fields from
 * community_platform_memberusers such as id, username, email, and display_name,
 * and may embed information about the active session created in
 * community_platform_memberuser_sessions.
 *
 * Error handling must cover validation failures (duplicate username/email, weak
 * password, invalid email format) and internal issues such as failures to
 * create a session or security event. If downstream writes to
 * community_platform_memberuser_sessions or
 * community_platform_user_security_events fail after inserting the main member
 * row, the implementation should log these inconsistencies—potentially using
 * community_platform_audit_logs or error logging tables described elsewhere—but
 * still avoid leaving the account in a partially configured security state. All
 * writes related to the new account, its initial status, session, and security
 * event should ideally occur in a single transaction to maintain consistency
 * across community_platform_memberusers,
 * community_platform_memberuser_sessions, community_platform_account_statuses,
 * and community_platform_user_security_events.
 *
 * This join endpoint is complemented by the memberUser login and refresh
 * endpoints that operate on existing rows in community_platform_memberusers and
 * community_platform_memberuser_sessions. Clients typically call join once per
 * email and username combination, then rely on login to obtain new tokens or
 * refresh to cycle tokens without re-supplying credentials. Together, these
 * operations form the core authentication surface for the memberUser actor and
 * rely on the fields and relationships defined in the Prisma models to ensure
 * secure, auditable registration flows.
 *
 * @param props.connection
 * @param props.body Registration payload for creating a new member user
 *   account, including username, email, and password plus any additional
 *   attributes needed to initialize community_platform_memberusers and related
 *   entities.
 * @setHeader token.access Authorization
 *
 * @path /auth/memberUser/join
 * @accessor api.functional.auth.memberUser.join
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
     * Registration payload for creating a new member user account,
     * including username, email, and password plus any additional
     * attributes needed to initialize community_platform_memberusers and
     * related entities.
     */
    body: ICommunityPlatformMemberuser.IJoinRequest;
  };
  export type Body = ICommunityPlatformMemberuser.IJoinRequest;
  export type Response = ICommunityPlatformMemberuser.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/memberUser/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/memberUser/join";
  export const random = (): ICommunityPlatformMemberuser.IAuthorized =>
    typia.random<ICommunityPlatformMemberuser.IAuthorized>();
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
 * Authenticate memberUser credentials using community_platform_memberusers and
 * return ICommunityPlatformMemberUser.IAuthorized on success.
 *
 * Authenticates a member user against stored credentials in
 * community_platform_memberusers and returns a new authorization envelope with
 * JWT tokens on success.
 *
 * This endpoint queries community_platform_memberusers by provided login
 * identifier—commonly email, potentially username depending on the
 * ICommunityPlatformMemberUser.ILoginRequest schema—and verifies the provided
 * password against the password_hash column. The verification must use a secure
 * hashing algorithm consistent with how password_hash was generated at
 * registration time. If no matching row is found or the hash comparison fails,
 * the operation must treat the attempt as a login failure and MUST NOT reveal
 * whether the email or username exists, to avoid account enumeration
 * vulnerabilities.
 *
 * Security-wise, the endpoint is public (authorizationActor is null) but
 * processes highly sensitive credential data. It must enforce rate limiting and
 * intrusion detection policies as described in the broader requirements,
 * potentially in conjunction with voting rate limit or security-related tables,
 * though at minimum it must ensure that repeated login failures can be tracked
 * through community_platform_user_security_events with event_type such as
 * "login_failure". The account_status_id foreign key from
 * community_platform_memberusers to community_platform_account_statuses must be
 * honored; for example, accounts in a suspended or banned status (as defined by
 * the key column in community_platform_account_statuses) should be denied
 * authentication even if password_hash matches.
 *
 * On successful authentication, the login operation establishes a new session
 * by inserting a row into community_platform_memberuser_sessions. It sets
 * community_platform_memberuser_id to the authenticated user id, copies the
 * current ip, href, and referrer from the request context, records created_at
 * as the login timestamp, and initially leaves expired_at as null. The
 * implementation may later update expired_at when a logout occurs or when the
 * session naturally expires. A security event row is then stored in
 * community_platform_user_security_events for the successful login with
 * actor_type = "memberuser", event_type = "login_success", and optional
 * metadata_json for additional context, such as whether multi-factor
 * authentication was used if supported.
 *
 * The response payload is defined by ICommunityPlatformMemberUser.IAuthorized,
 * which includes newly generated access and refresh tokens along with essential
 * identity details extracted from community_platform_memberusers such as id,
 * username, email, display_name, and any status-related attributes the DTO
 * chooses to expose. This DTO gives the client enough data to establish an
 * authenticated context and display user-facing information while ensuring that
 * sensitive fields like password_hash are never exposed.
 *
 * Error handling includes authentication failures, status-based denials (e.g.,
 * banned accounts), and internal errors when writing to
 * community_platform_memberuser_sessions or
 * community_platform_user_security_events. Failures to persist the session or
 * event must be treated seriously; implementations should log them using
 * appropriate audit tables while ensuring that the issuance of tokens does not
 * proceed when session creation fails, to avoid having untracked authenticated
 * contexts. This operation, together with join and refresh, forms the heart of
 * the memberUser authentication workflow, all backed by the fields and
 * constraints of the related Prisma models.
 *
 * @param props.connection
 * @param props.body Login payload containing the member user's credential
 *   information, such as email or username plus password, used to authenticate
 *   against community_platform_memberusers.password_hash.
 * @setHeader token.access Authorization
 *
 * @path /auth/memberUser/login
 * @accessor api.functional.auth.memberUser.login
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
     * Login payload containing the member user's credential information,
     * such as email or username plus password, used to authenticate against
     * community_platform_memberusers.password_hash.
     */
    body: ICommunityPlatformMemberuser.ILoginRequest;
  };
  export type Body = ICommunityPlatformMemberuser.ILoginRequest;
  export type Response = ICommunityPlatformMemberuser.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/memberUser/login",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/memberUser/login";
  export const random = (): ICommunityPlatformMemberuser.IAuthorized =>
    typia.random<ICommunityPlatformMemberuser.IAuthorized>();
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
 * Refresh JWT tokens for memberUser using existing active sessions in
 * community_platform_memberuser_sessions and return
 * ICommunityPlatformMemberUser.IAuthorized.
 *
 * Issues new JWT tokens for a member user based on a valid refresh token and
 * existing session records in community_platform_memberuser_sessions, without
 * re-supplying credentials.
 *
 * This endpoint accepts a refresh token payload defined by
 * ICommunityPlatformMemberUser.IRefreshRequest and validates it against the
 * platform's token storage and session tracking logic backed by
 * community_platform_memberuser_sessions. The implementation typically resolves
 * the refresh token to a concrete session and member user, ensuring that the
 * corresponding community_platform_memberuser_sessions row is still
 * active—represented by a null or future expired_at—and that the linked
 * community_platform_memberusers row has a non-null account_status_id
 * referencing an allowed status in community_platform_account_statuses.
 *
 * From a security viewpoint, the refresh endpoint is public (authorizationActor
 * is null) but operates only on tokens that were previously issued and are
 * still valid. It must enforce strict checks on token integrity and revocation
 * state and must confirm that the underlying member account has not
 * transitioned into a disallowed status (for example, a status whose key in
 * community_platform_account_statuses indicates banned or suspended). Any
 * attempt to use a revoked, expired, or malformed refresh token should be
 * rejected and logged as a security event.
 *
 * Upon successful validation, the service generates a new pair of access and
 * refresh tokens associated with the same or a newly rotated session. It may
 * update the existing row in community_platform_memberuser_sessions by
 * adjusting created_at and expired_at or insert a new session row linked
 * through community_platform_memberuser_id, ip, href, and referrer according to
 * current request context. In either case, it records a security event in
 * community_platform_user_security_events with actor_type = "memberuser",
 * event_type such as "token_refresh", and any supplementary metadata_json that
 * captures details of the rotation.
 *
 * The response uses ICommunityPlatformMemberUser.IAuthorized to return the new
 * tokens and refreshed identity snapshot for the member user, including fields
 * such as id, username, email, display_name, and possibly summary account
 * status information derived from the join to
 * community_platform_account_statuses. This keeps client applications in sync
 * with any recent changes to the user's status or profile while maintaining a
 * seamless authentication experience.
 *
 * Error handling focuses on invalid or expired refresh tokens, sessions whose
 * expired_at is set or otherwise invalid, and account status transitions that
 * forbid token renewal. Any such failure should result in a clear but
 * security-conscious error response and the recording of a security event in
 * community_platform_user_security_events. Together with the join and login
 * endpoints, this refresh operation leverages the Prisma models to provide a
 * robust, token-based authentication lifecycle for the memberUser actor.
 *
 * @param props.connection
 * @param props.body Refresh token payload used to request new JWT tokens for a
 *   member user session without re-entering credentials.
 * @setHeader token.access Authorization
 *
 * @path /auth/memberUser/refresh
 * @accessor api.functional.auth.memberUser.refresh
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
     * Refresh token payload used to request new JWT tokens for a member
     * user session without re-entering credentials.
     */
    body: ICommunityPlatformMemberuser.IRefreshRequest;
  };
  export type Body = ICommunityPlatformMemberuser.IRefreshRequest;
  export type Response = ICommunityPlatformMemberuser.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/memberUser/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/memberUser/refresh";
  export const random = (): ICommunityPlatformMemberuser.IAuthorized =>
    typia.random<ICommunityPlatformMemberuser.IAuthorized>();
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
