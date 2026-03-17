import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageITodoAppMemberSession } from "../../../../structures/IPageITodoAppMemberSession";
import { ITodoAppMemberSession } from "../../../../structures/ITodoAppMemberSession";

/**
 * Retrieve a filtered and paginated list of authenticated session records that belong to the signed-in member.
 *
 * This operation exposes the member's own session history for the private todo application. It is backed by the `todo_app_member_sessions` table, which stores authenticated session records for member accounts and captures connection context for a successful sign-in, including the client IP address, requested application href, referrer, creation time, and expiration time. The endpoint is intended for account-scoped session visibility only and does not expose unrelated business-domain data.
 *
 * Security and privacy are ownership-based. The system must evaluate the request in the signed-in member's own account context and return only session rows whose `todo_app_member_id` matches the authenticated member account. The same isolation boundary described for profile, todo, and history data applies here as part of account security and session separation: one member must never be able to browse, search, or infer another member's session records. If the caller is not authenticated, access to this endpoint must be rejected.
 *
 * The operation supports list browsing behavior suitable for session review screens, such as pagination, ordering, and optional filtering over session attributes that actually exist in the schema. Filtering may be applied to values such as `ip`, `href`, `referrer`, `created_at`, and `expired_at`, and results should commonly be shown from most recent to oldest creation time so the member can review current and prior authenticated access. Because this is a list retrieval with structured search input, the endpoint uses the `patch` method rather than `get`.
 *
 * This operation is read-only. It does not create sessions, extend expiration, terminate sessions, or modify member account state. Session creation occurs during successful sign-in, and session ending occurs through logout or expiration lifecycle handling. Consumers should use the authentication and logout operations for those behaviors and use this endpoint only to inspect the member's own existing session records.
 *
 * Expected error handling follows the application's authentication and privacy rules. Requests without an active authenticated session must be rejected, and any attempt to widen scope beyond the current member's ownership boundary must be ignored or rejected by the service layer rather than trusted from client input.
 *
 * @param props.connection
 * @param props.body Session search filters, pagination, and sorting options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only session listing query over `todo_app_member_sessions` scoped to the authenticated member.
 *
 * Resolve the authenticated member from the active session context and never accept ownership scope from client-provided identifiers. Build the query with a mandatory predicate `todo_app_member_id = <authenticated member id>`. Do not expose or honor any request field that attempts to target another member account.
 *
 * Accept a request body of type `ITodoAppMemberSession.IRequest` for pagination, sorting, and optional filters based only on schema-backed columns. Supported filtering should be limited to fields that exist in the table, such as exact or partial matching for `ip`, `href`, and `referrer`, plus date/time range filtering for `created_at` and `expired_at` if the shared request conventions support those expressions. Default ordering should prioritize newest sessions first using `created_at desc`, with a stable secondary sort such as `id desc` when needed.
 *
 * Return a paginated result of type `IPageITodoAppMemberSession.ISummary`. Each item should contain summary-safe session information derived from the session row, appropriate for account session review. Do not join unrelated domain tables. A join to `todo_app_members` is unnecessary unless implementation infrastructure requires ownership verification beyond the authenticated principal lookup.
 *
 * Reject unauthenticated requests before querying. If the authenticated session is absent, expired, or otherwise invalid, return the standard authorization failure for member-only features. If filters are malformed, return a validation error without executing a broad fallback query. Ensure pagination limits are enforced to avoid unbounded scans.
 *
 * This operation must remain read-only and must not mutate session expiration, create new session rows, or remove existing session rows. Session lifecycle changes belong to sign-in, logout, and expiration handling paths, not this endpoint.
 * @path /todoApp/member/sessions
 * @accessor api.functional.todoApp.member.sessions.index
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
     * Session search filters, pagination, and sorting options
     */
    body: ITodoAppMemberSession.IRequest;
  };
  export type Body = ITodoAppMemberSession.IRequest;
  export type Response = IPageITodoAppMemberSession.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/todoApp/member/sessions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/todoApp/member/sessions";
  export const random = (): IPageITodoAppMemberSession.ISummary =>
    typia.random<IPageITodoAppMemberSession.ISummary>();
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
 * Retrieve a single authenticated session record that belongs to the signed-in member in the private todo application.
 *
 * This operation returns the details of one session from the session-tracking data stored for successful sign-ins. The underlying database entity is `todo_app_member_sessions`, which is described as authenticated session records for member accounts in the private todo application. A session captures connection context for a successful sign-in, including the client IP address, the requested application href, the referrer observed at session creation, the creation timestamp, and the expiration timestamp. The returned resource is intended to help a member inspect one specific session within their own private account context.
 *
 * Access to this operation is restricted to the `member` actor and must be evaluated strictly within the signed-in member's ownership boundary. The requirements state that a signed-in member can access only their own account, profile, todos, deleted todos, and edit history, and that one member's session must never expose another member's information. For that reason, the requested session must be looked up by `todo_app_member_sessions.id` and then validated against the authenticated member identity through `todo_app_member_sessions.todo_app_member_id`. If the session does not belong to the signed-in member, the system must deny access.
 *
 * This operation is directly related to the member session lifecycle defined in the authentication requirements. A session remains active until logout or expiration, and logout ends the current session without changing account, profile, todo, or history data. The operation is therefore read-only and observational: it does not modify session state, renew expiration, or terminate the session. Consumers that need to end a session should use the dedicated logout capability rather than this retrieval endpoint.
 *
 * Expected behavior includes returning the session record when it exists and is owned by the authenticated member, rejecting access when the caller is not authenticated, and rejecting access when the session belongs to another member or does not exist within the caller's account scope. The response should reflect the persisted session metadata defined in the database schema and should not include unrelated member credential data such as password hashes.
 *
 * @param props.connection
 * @param props.sessionId Target session record identifier owned by the signed-in member
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service method that resolves the authenticated member from the current authorization context, then queries `todo_app_member_sessions` for a single row whose `id` matches the path parameter.
 *
 * After loading the row, enforce ownership by verifying that `todo_app_member_sessions.todo_app_member_id` is equal to the authenticated member's `id`. If no authenticated member exists, fail with an authorization error. If the session row does not exist, return a not-found error. If the row exists but is owned by a different member, return a forbidden or not-found style access denial according to the service's security convention, without disclosing another member's existence.
 *
 * Map the persisted fields `id`, `todo_app_member_id`, `ip`, `href`, `referrer`, `created_at`, and `expired_at` into the `ITodoAppMemberSession` response DTO. Do not expose `todo_app_members.password_hash` or other unrelated account internals. This operation must not mutate the session record, extend the expiration timestamp, or create any replacement session.
 *
 * Use a simple single-row lookup, optionally joined to `todo_app_members` only if the implementation layer needs to confirm account existence through relational integrity; otherwise the foreign key constraint already guarantees membership linkage. No transaction is required beyond the default read consistency for a single select. Ensure the implementation remains account-scoped and does not provide any browsing facility over other members' sessions.
 * @path /todoApp/member/sessions/:sessionId
 * @accessor api.functional.todoApp.member.sessions.at
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
     * Target session record identifier owned by the signed-in member
     */
    sessionId: string & tags.Format<"uuid">;
  };
  export type Response = ITodoAppMemberSession;

  export const METADATA = {
    method: "GET",
    path: "/todoApp/member/sessions/:sessionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/todoApp/member/sessions/${encodeURIComponent(props.sessionId ?? "null")}`;
  export const random = (): ITodoAppMemberSession =>
    typia.random<ITodoAppMemberSession>();
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
      assert.param("sessionId")(() => typia.assert(props.sessionId));
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
