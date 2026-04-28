import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IHrmTimeTrackingEmployee } from "../../../../structures/IHrmTimeTrackingEmployee";

/**
 * This operation registers a new employee authentication identity for the HRM time tracking platform. The underlying actor table, hrm_time_tracking_employees, is described as the authenticated employee account identity store and the parent record for employee authentication flows. The table confirms that the employee signs in with a unique email address and a hashed password, so this endpoint exists to accept employee registration data and create that root authentication record before the employee begins using organization-scoped features such as timelog entry, timesheet work, assigned project access, and personal dashboard usage.
 *
 * At the database level, this operation writes to hrm_time_tracking_employees, whose columns establish the exact authentication boundary. The email column is the unique sign-in identifier, password_hash stores the hashed credential rather than raw secret input, email_verified_at records whether the email has been verified, and last_logged_in_at remains focused on successful sign-in tracking instead of registration itself. The table commentary explicitly states that organization-scoped workforce attributes do not belong in this authentication record, so this endpoint must not attempt to create department placement, role assignment, employment type, or other HR attributes as part of employee authentication registration.
 *
 * From a workflow perspective, this endpoint is the entry point into the member authentication lifecycle described by the loaded requirements for registration and login. Because the employee actor is a member actor rather than a guest actor, registration is part of the standard authentication set and is expected to lead into token issuance. If the platform authorizes the employee immediately after successful sign-up, the implementation should also establish a corresponding row in hrm_time_tracking_employee_sessions so the issued tokens map to persistent session state that records the sign-in context, selected workspace when applicable, session expiration, and future explicit logout state.
 *
 * Security handling must enforce the uniqueness of the employee email, must hash the password before it is saved into password_hash, and must never expose whether a stored password hash exists beyond normal credential lifecycle semantics. If a duplicate email conflicts with the unique constraint, the endpoint should return a business-safe validation error. If registration succeeds but downstream session creation cannot be completed, the entire transaction should fail so the system does not leave a partially registered identity with no valid authorization outcome.
 *
 * This endpoint is commonly followed by ordinary authenticated product flows rather than by another prerequisite authorization endpoint. It is related to POST /auth/employee/login because both act on the same hrm_time_tracking_employees credential record, and it is related to POST /auth/employee/refresh because the authorization response should produce tokens that later participate in renewal. It must not document or depend on a logout API because logout is not represented as an authorization operation in this stateless JWT design.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Employee registration payload with credential fields required to create an employee account.
 * @x-autobe-authorization-type join
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement employee account registration by validating
 *   the incoming join payload, normalizing the email value, and checking
 *   hrm_time_tracking_employees for an existing non-deleted account with the
 *   same unique email. If a conflicting active account exists, reject the
 *   request with a validation error. If the business policy allows
 *   re-registration of a previously deleted account, that policy must be
 *   explicitly defined elsewhere; otherwise reject when any matching unique
 *   email exists because the table enforces uniqueness.
 *
 * Hash the provided password before persistence and create a new hrm_time_tracking_employees row with a generated UUID, email, password_hash, null email_verified_at unless verification is completed during registration, null last_logged_in_at, current created_at, current updated_at, and null deleted_at. After creating the employee identity, create an authenticated session record in hrm_time_tracking_employee_sessions if the authorization architecture issues tokens immediately after join. Populate the session with the employee id, optional selected organization context if supplied by the join flow, request metadata such as ip, href, and referrer, null logged_out_at, current created_at, and an appropriate expired_at timestamp.
 *
 * Return an IHrmTimeTrackingEmployee.IAuthorized payload containing the issued authorization tokens and any token metadata expected by the shared authorization DTO. Handle duplicate email, invalid input, hashing failure, and transactional persistence failure as error cases. Ensure the employee row creation and optional initial session creation occur atomically so no authorization token is issued without a corresponding persistent identity and session state.
 * @path /hrmTimeTracking/auth/employee/join
 * @accessor api.functional.hrmTimeTracking.auth.employee.join
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
     * Employee registration payload with credential fields required to create an employee account.
     */
    body: IHrmTimeTrackingEmployee.IJoin;
  };
  export type Body = IHrmTimeTrackingEmployee.IJoin;
  export type Response = IHrmTimeTrackingEmployee.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/auth/employee/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/auth/employee/join";
  export const random = (): IHrmTimeTrackingEmployee.IAuthorized =>
    typia.random<IHrmTimeTrackingEmployee.IAuthorized>();
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
 * This operation authenticates an existing employee account by validating credentials against the employee actor table. The hrm_time_tracking_employees schema explicitly describes this model as the authenticated employee account identity for the HRM time tracking platform and states that it stores the login credentials and global authentication state used when an employee signs in with email and password. Accordingly, this endpoint uses the confirmed email and password_hash fields as the primary credential pair for employee login.
 *
 * The session model hrm_time_tracking_employee_sessions provides the persistence layer that explains how login should behave after credentials are accepted. That table records each employee sign-in event together with connection metadata, the currently selected organization workspace, expiration timing, and explicit logout state. Its documented purpose is to support authentication and authorization flows rather than standalone business management. Therefore, a successful login should not only validate credentials but also create a new session row that captures the sign-in event and anchors the resulting authorization tokens to auditable session state.
 *
 * The relationship between the employee identity row and the session row is especially important in this multi-organization product. The employee schema notes that active organization context does not belong to the root actor identity and instead belongs to session records. That means this endpoint is the correct place to attach or initialize the currently selected workspace for the authenticated session, rather than storing organization context on hrm_time_tracking_employees itself. This preserves the intended separation between global identity and session-scoped tenant activity.
 *
 * Security behavior must include password verification against password_hash, careful rejection of invalid credentials without leaking which credential failed, and lifecycle enforcement using confirmed schema fields. Because hrm_time_tracking_employees includes deleted_at, this login endpoint must prevent authentication of deleted employee accounts. Because the schema also includes email_verified_at and last_logged_in_at, the endpoint may incorporate verification policy and must record the most recent successful sign-in when authentication completes. Any failure during session persistence should cause the login flow to fail rather than issuing tokens that are not traceable to hrm_time_tracking_employee_sessions.
 *
 * This endpoint is related to POST /auth/employee/join for first-time account creation and to POST /auth/employee/refresh for continued access after the initial access token nears expiration. No business prerequisite endpoint is required before calling login, because authentication is public and self-contained. Likewise, there is no logout API dependency documented here, since explicit logout behavior is represented in the session table but logout itself is not generated as an authorization endpoint in this task.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Employee login payload containing the credentials required to authenticate an employee account.
 * @x-autobe-authorization-type login
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement employee login by locating the employee
 *   identity in hrm_time_tracking_employees using the unique email field and
 *   rejecting the request if no active matching account exists or if deleted_at
 *   indicates the account is deleted. Verify the provided password against
 *   password_hash using the platform password hashing strategy. On successful
 *   authentication, update last_logged_in_at to the current timestamp and
 *   create a new hrm_time_tracking_employee_sessions row capturing the employee
 *   id, optional selected organization workspace, request ip, href, referrer,
 *   null logged_out_at, current created_at, and a computed expired_at.
 *
 * Issue authorization tokens represented by IHrmTimeTrackingEmployee.IAuthorized. The tokens should be bound to the created session so refresh validation can later confirm session expiry and logout state. If the schema-supported workflow requires email verification before full access, the implementation may validate email_verified_at and either reject login or limit downstream access according to system policy, but it must only rely on this confirmed field rather than inventing other verification markers.
 *
 * Handle invalid credentials without revealing whether the email or password was incorrect. Reject deleted accounts, expired or otherwise disallowed lifecycle states inferred from deleted_at, and failed session persistence. Ensure that updating last_logged_in_at and creating the new session occur consistently with token issuance so auditability and authorization state remain synchronized.
 * @path /hrmTimeTracking/auth/employee/login
 * @accessor api.functional.hrmTimeTracking.auth.employee.login
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
     * Employee login payload containing the credentials required to authenticate an employee account.
     */
    body: IHrmTimeTrackingEmployee.ILogin;
  };
  export type Body = IHrmTimeTrackingEmployee.ILogin;
  export type Response = IHrmTimeTrackingEmployee.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/auth/employee/login",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/auth/employee/login";
  export const random = (): IHrmTimeTrackingEmployee.IAuthorized =>
    typia.random<IHrmTimeTrackingEmployee.IAuthorized>();
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
 * This operation renews employee authorization after an earlier authenticated session has already been established. The database schema for hrm_time_tracking_employee_sessions states that session rows record sign-in events, selected organization workspace, expiration timing, and logout state, and that the model is used directly by authentication and authorization flows. That makes the session table the canonical persistence layer for deciding whether an employee refresh request is still valid.
 *
 * The refresh flow depends on confirmed session lifecycle fields. The expired_at column defines the timestamp when the employee session becomes invalid and must no longer be accepted, while logged_out_at records whether the session has been explicitly terminated. Even though logout is not exposed as an API operation in this task, the existence of logged_out_at means refresh must honor prior termination state and refuse to mint new authorization tokens for a session that has already been ended. This endpoint therefore protects the integrity of token renewal by checking the real session lifecycle tracked in storage.
 *
 * The employee identity record also remains relevant during refresh. The hrm_time_tracking_employees table is the root authentication identity and includes deleted_at for account deletion state. If an employee account has been deleted after earlier authentication, refresh must not continue granting access. The endpoint should therefore verify both the persistent session record and the underlying employee identity before returning a new IHrmTimeTrackingEmployee.IAuthorized payload.
 *
 * This operation is part of the standard member authorization lifecycle and is normally called after POST /auth/employee/login or POST /auth/employee/join has already produced the original authorization payload. It does not require any separate business prerequisite endpoint, because the required dependency is the existing authenticated session itself rather than another API call. Its response should align with the same authorized token shape used by join and login so client applications can handle the authorization lifecycle consistently.
 *
 * Error handling should treat expired, missing, terminated, or otherwise invalid refresh attempts as authentication failures and should avoid revealing internal token validation strategy. The endpoint must stay within the schema-supported boundaries and should not claim unsupported mechanisms beyond the confirmed session and employee lifecycle fields present in the loaded database models.
 *
 * @setHeader token.access Authorization
 *
 * @param props.connection
 * @param props.body Employee refresh payload containing the token material required to renew authorization.
 * @x-autobe-authorization-type refresh
 * @x-autobe-authorization-actor employee
 * @x-autobe-specification Implement token refresh by validating the incoming
 *   refresh payload against the platform's refresh-token strategy and resolving
 *   the associated persistent employee session. Confirm that the related
 *   hrm_time_tracking_employee_sessions row exists, has not reached expired_at,
 *   and has not been explicitly terminated through logged_out_at. Also confirm
 *   that the referenced hrm_time_tracking_employees account still exists and is
 *   not deleted according to deleted_at. When refresh is accepted, issue a new
 *   IHrmTimeTrackingEmployee.IAuthorized token payload and update session state
 *   as needed by the token rotation policy.
 *
 * If refresh token rotation is used, revoke or replace the prior refresh credential in the server-side token store or token versioning layer while preserving the same underlying session row when appropriate. If the architecture instead mints a replacement session during refresh, create the new session atomically and invalidate the previous one. In either approach, preserve auditability and do not authorize refresh for logged-out or expired sessions.
 *
 * Reject malformed refresh requests, missing sessions, expired sessions, logged-out sessions, and deleted employee accounts. Keep error responses generic enough to avoid leaking token validation details. Ensure all refresh logic remains grounded in the session model because session expiration and logout state are explicitly modeled there.
 * @path /hrmTimeTracking/auth/employee/refresh
 * @accessor api.functional.hrmTimeTracking.auth.employee.refresh
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
     * Employee refresh payload containing the token material required to renew authorization.
     */
    body: IHrmTimeTrackingEmployee.IRefresh;
  };
  export type Body = IHrmTimeTrackingEmployee.IRefresh;
  export type Response = IHrmTimeTrackingEmployee.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/hrmTimeTracking/auth/employee/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/auth/employee/refresh";
  export const random = (): IHrmTimeTrackingEmployee.IAuthorized =>
    typia.random<IHrmTimeTrackingEmployee.IAuthorized>();
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
