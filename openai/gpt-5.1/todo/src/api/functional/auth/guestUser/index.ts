import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { ITodoAppGuestUserJoin } from "../../../structures/ITodoAppGuestUserJoin";
import { ITodoAppGuestUser } from "../../../structures/ITodoAppGuestUser";
import { ITodoAppGuestUserRefresh } from "../../../structures/ITodoAppGuestUserRefresh";

/**
 * Register or reuse a guest identity in todo_app_guestusers and create a linked
 * session in todo_app_guestuser_sessions, issuing guestUser JWT tokens.
 *
 * This operation registers or reuses a guest identity for the guestUser actor
 * and immediately establishes a corresponding guest session by interacting with
 * the todo_app_guestusers and todo_app_guestuser_sessions tables. The
 * underlying todo_app_guestusers table stores minimal identity information for
 * unauthenticated visitors, including a UUID primary key `id`, optional
 * `external_reference` for linking to cookies or external systems, optional
 * `display_name` for a human-readable nickname, mandatory `status` representing
 * lifecycle state, and non-nullable timestamps `created_at` and `updated_at`.
 * When this endpoint is called, the service inspects the payload fields mapped
 * from ITodoAppGuestUserJoin.IRequest and either finds an existing guest record
 * that shares the same `external_reference` or creates a new row initialized
 * with appropriate `status` and timestamps.
 *
 * From a security perspective, this join operation is intentionally
 * unauthenticated so that any visitor can obtain a guest identity and session
 * without prior credentials. However, the issued JWTs returned through
 * ITodoAppGuestUser.IAuthorized must be scoped to guest-level permissions only,
 * ensuring that the resulting guestUser context cannot access any Todo data or
 * privileged administrative features. The schema comments for
 * todo_app_guestusers clarify that these identities are not used for strong
 * authentication; instead, they act as stable references for analytics, trials,
 * or potential upgrade flows. The implementation must respect this by avoiding
 * the storage of secrets or password-like fields in this table.
 *
 * The operation also interacts with the todo_app_guestuser_sessions table,
 * which records each tracked session through fields such as `id` (UUID primary
 * key), foreign key `todo_app_guestuser_id` pointing to the owning guest
 * identity, `ip` for the client IP address, `href` for the initial URL,
 * `referrer` for the referring URL, non-nullable `created_at` indicating when
 * the session was opened, and nullable `expired_at` representing when the
 * session ended. For each successful join call, the implementation is expected
 * to create a new session row linked to the chosen todo_app_guestusers record,
 * ensuring auditability and traceability of guest activity.
 *
 * From a business-flow standpoint, this join endpoint is the first step for any
 * guestUser workflow in the system. Clients typically call it when a new
 * visitor lands on the site and before any guest-scoped interactions that
 * require tracking. The description comments emphasize that guest users do not
 * own Todos directly in the current scope, so this operation focuses on
 * identity and session creation rather than data ownership. Subsequent calls
 * that require a guest context, such as viewing public documentation with
 * personalization, will rely on the JWT claims provided by
 * ITodoAppGuestUser.IAuthorized.
 *
 * Validation rules derived from the Prisma comments include ensuring that any
 * provided `external_reference` and `display_name` respect reasonable length
 * and formatting constraints defined at the DTO level, while `status`,
 * `created_at`, and `updated_at` must always be set by the system, not the
 * client. The `ip`, `href`, and `referrer` fields in
 * todo_app_guestuser_sessions are considered mandatory in the database, so the
 * implementation must guarantee they are populated either from the request DTO
 * or from server-side context like HTTP headers. Error handling should clearly
 * distinguish between validation errors in the ITodoAppGuestUserJoin.IRequest
 * payload and unexpected persistence failures in the guest identity or session
 * tables.
 *
 * This operation is designed to be used together with the guest refresh
 * endpoint `/auth/guestUser/refresh`, which will rely on the refresh token
 * issued here to rotate or renew guest tokens. In typical flows, clients will
 * first call this join operation once per browser or device, then subsequently
 * use refresh to maintain an active guest session over time without repeatedly
 * creating new todo_app_guestusers or todo_app_guestuser_sessions rows. Any
 * future upgrade path from guestUser to a registered todoUser should also
 * reference the identity established here.
 *
 * @param props.connection
 * @param props.body Client-supplied context for establishing or reusing a
 *   guestUser identity and creating an associated guest session, including
 *   optional external reference, display name, and navigation details.
 * @setHeader token.access Authorization
 *
 * @path /auth/guestUser/join
 * @accessor api.functional.auth.guestUser.join
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
     * Client-supplied context for establishing or reusing a guestUser
     * identity and creating an associated guest session, including optional
     * external reference, display name, and navigation details.
     */
    body: ITodoAppGuestUserJoin.IRequest;
  };
  export type Body = ITodoAppGuestUserJoin.IRequest;
  export type Response = ITodoAppGuestUser.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/guestUser/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/guestUser/join";
  export const random = (): ITodoAppGuestUser.IAuthorized =>
    typia.random<ITodoAppGuestUser.IAuthorized>();
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
 * Refresh JWT tokens for an existing guestUser session using
 * todo_app_guestuser_sessions while validating the linked identity in
 * todo_app_guestusers.
 *
 * This operation renews JWT tokens for an existing guestUser session by
 * validating a refresh token against the session data stored in the
 * todo_app_guestuser_sessions table and its associated identity in
 * todo_app_guestusers. The todo_app_guestuser_sessions table models each
 * tracked guest session with a UUID `id`, a foreign key `todo_app_guestuser_id`
 * referencing `todo_app_guestusers.id`, and fields `ip`, `href`, `referrer`,
 * `created_at`, and nullable `expired_at`. When a client submits a refresh
 * request through ITodoAppGuestUserRefresh.IRequest, the implementation will
 * decode and verify the refresh token, then locate the corresponding session
 * record and ensure that `expired_at` is still null or otherwise indicates a
 * valid, active session according to business rules.
 *
 * The todo_app_guestusers table provides the stable identity backing each
 * session. It contains an `id` primary key, optional `external_reference` for
 * linking to cookies or other identifiers, optional `display_name`, mandatory
 * `status`, and timestamps `created_at` and `updated_at`. During a successful
 * refresh, the system may update the `updated_at` field to reflect recent
 * activity and, depending on design, might enforce that `status` remains in an
 * allowed state such as "active" before issuing new tokens. This prevents the
 * issuance of refreshed tokens for guest identities that have been
 * administratively disabled or archived.
 *
 * From a security standpoint, this endpoint is restricted to callers that
 * already possess a valid refresh token encoded in the
 * ITodoAppGuestUserRefresh.IRequest payload. Unlike the guest join operation,
 * which is anonymous, refresh acts as a controlled path for maintaining
 * continuity of the same guestUser identity across requests while respecting
 * the session state recorded in todo_app_guestuser_sessions. The JWTs produced
 * in the ITodoAppGuestUser.IAuthorized response must remain constrained to
 * guest-level capabilities so that even refreshed tokens cannot be escalated to
 * Todo ownership or administrative privileges.
 *
 * In typical application workflows, clients obtain an initial refresh token by
 * calling `/auth/guestUser/join` and then periodically invoke
 * `/auth/guestUser/refresh` before their access tokens expire. The refresh
 * implementation can choose to extend session lifetime by leaving the existing
 * todo_app_guestuser_sessions row active and only updating timestamps, or by
 * creating a new session row and marking the previous one as expired via the
 * `expired_at` field. Regardless of the approach, the description from the
 * Prisma schema emphasizes that these sessions serve telemetry and gradual
 * upgrade purposes, so the system should maintain clear audit trails for each
 * guest's activity.
 *
 * Error handling for this operation includes rejecting requests where the
 * refresh token is malformed, does not map to any existing session, or maps to
 * a session whose `expired_at` is set, as well as scenarios where the linked
 * guest identity in todo_app_guestusers has an invalid `status`. Validation
 * errors related to ITodoAppGuestUserRefresh.IRequest must be clearly
 * distinguished from authorization failures, allowing clients to determine
 * whether to re-initiate the flow using the `/auth/guestUser/join` endpoint or
 * to simply retry with corrected input. This separation, aligned with the
 * Prisma schema comments, ensures robust token lifecycle management for
 * guestUser actors.
 *
 * @param props.connection
 * @param props.body Refresh token and related client metadata required to
 *   validate and renew a guestUser session.
 * @setHeader token.access Authorization
 *
 * @path /auth/guestUser/refresh
 * @accessor api.functional.auth.guestUser.refresh
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
     * Refresh token and related client metadata required to validate and
     * renew a guestUser session.
     */
    body: ITodoAppGuestUserRefresh.IRequest;
  };
  export type Body = ITodoAppGuestUserRefresh.IRequest;
  export type Response = ITodoAppGuestUser.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/guestUser/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/guestUser/refresh";
  export const random = (): ITodoAppGuestUser.IAuthorized =>
    typia.random<ITodoAppGuestUser.IAuthorized>();
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
