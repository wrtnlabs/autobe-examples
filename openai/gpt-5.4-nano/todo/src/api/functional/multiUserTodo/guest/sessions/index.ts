import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IMultiUserTodoMemberSession } from "../../../../structures/IMultiUserTodoMemberSession";

/**
 * This operation updates or refreshes the client’s current session context for the multiUserTodo system.
 *
 * The service uses session tables to enforce that authenticated actions are always performed within the scope of the authenticated member, and that unauthenticated visitors cannot access protected todo/profile operations. In particular, authenticated member sessions are represented by records in {@link multi_user_todo_member_sessions} (including expiration and connection metadata such as IP, href, and referrer), while guest access is represented by {@link multi_user_todo_guest_sessions} and correlated to guest identities in {@link multi_user_todo_guests}.
 *
 * For a request to succeed, the acting principal must be able to reference its current session context. The implementation must ensure that session updates cannot be used to access another member’s resources: the session identifier (implicitly bound to the authenticated session middleware context) must map only to the acting member’s record, and no cross-user linkage must be introduced.
 *
 * The operation is intended to be used for session lifetime enforcement and connection metadata capture. It must update the appropriate session record fields (for member sessions: {@link multi_user_todo_member_sessions.expired_at}, {@link multi_user_todo_member_sessions.ip}, {@link multi_user_todo_member_sessions.href}, {@link multi_user_todo_member_sessions.referrer}; for guest sessions: {@link multi_user_todo_guest_sessions.expired_at}, {@link multi_user_todo_guest_sessions.ip}, {@link multi_user_todo_guest_sessions.href}, {@link multi_user_todo_guest_sessions.referrer}) based on whether the acting principal is a guest or an authenticated member.
 *
 * If the session context is missing or invalid (for example, the expiration time has already passed), the system must reject the request and the client must re-establish authentication/guest identity through normal account/session flows.
 *
 * Related operations: subsequent protected todo/profile operations rely on the active session context established by this operation, consistent with the session-to-access flow described in the requirements. Unauthorized or invalid session contexts must be handled with the project’s unified rejection rules and without side effects on unrelated data.
 *
 * @param props.connection
 * @param props.body Request payload for updating or refreshing the current session context (connection metadata and/or expiration enforcement parameters).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor guest
 * @x-autobe-specification PATCH /sessions: Update/refresh current session context.
 *
 * Implementation steps:
 * 1) Identify acting session type from middleware context:
 *    - If member-authenticated: operate on multi_user_todo_member_sessions.
 *    - Otherwise: operate on multi_user_todo_guest_sessions linked to multi_user_todo_guests.
 * 2) Resolve the current session record by the session identifier provided by middleware (do not accept arbitrary session IDs in the request body; session must remain bound to the acting principal).
 * 3) Validate session availability:
 *    - Reject when the resolved session is missing.
 *    - Reject when expired_at is in the past.
 * 4) Apply updates using a single transaction:
 *    - Update connection metadata fields if provided in request body, otherwise keep existing values.
 *    - Update expiration timestamp if the request body indicates refresh behavior.
 *    - Update updated_at only if the target table includes it (member_sessions table in schema does not have updated_at; only created_at and expired_at exist, so do not attempt to write updated_at for member sessions).
 *    - For guest sessions: update ip/href/referrer and expired_at; respect deleted_at if present by excluding deleted records.
 * 5) Persist changes and return a session summary DTO.
 *
 * Edge cases:
 * - When refresh is requested but would extend beyond allowed limits (if implemented), cap or reject with a business-level error.
 * - Ensure data isolation: never allow updating a session record not belonging to the acting principal.
 * - If a transient failure occurs, ensure no partial writes are committed.
 *
 * Authorization:
 * - This operation must be allowed only for already-established session contexts; unauthenticated access should be rejected by session middleware.
 * - Guest vs member session resolution must remain isolated to the acting principal.
 *
 * Error handling:
 * - For invalid/expired session contexts, return a business-level rejection with a clear explanation.
 * - For unexpected server errors, return a generic error without leaking internal details.
 * @path /multiUserTodo/guest/sessions
 * @accessor api.functional.multiUserTodo.guest.sessions.updateSession
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updateSession(
  connection: IConnection,
  props: updateSession.Props,
): Promise<updateSession.Response> {
  return true === connection.simulate
    ? updateSession.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updateSession.METADATA,
          path: updateSession.path(),
          status: null,
        },
        props.body,
      );
}
export namespace updateSession {
  export type Props = {
    /**
     * Request payload for updating or refreshing the current session context (connection metadata and/or expiration enforcement parameters).
     */
    body: IMultiUserTodoMemberSession.IRequest;
  };
  export type Body = IMultiUserTodoMemberSession.IRequest;
  export type Response = IMultiUserTodoMemberSession.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/multiUserTodo/guest/sessions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/multiUserTodo/guest/sessions";
  export const random = (): IMultiUserTodoMemberSession.ISummary =>
    typia.random<IMultiUserTodoMemberSession.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: updateSession.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updateSession.path(),
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
 * Retrieve a specific authenticated-member session record by its session identifier.
 *
 * This endpoint supports the system’s session persistence and authentication enforcement. In the underlying data model, member session records are stored with connection context fields (captured client IP address, requested href, and HTTP referrer) and an expiration timestamp that determines when the session can no longer be treated as authenticated.
 *
 * Because the system associates todo and profile access with the session’s authenticated member, this operation must ensure privacy boundaries: when the requester is acting as a member, the operation must only return the session record if it belongs to that acting member. If the session does not exist or does not belong to the acting member, the operation must be rejected in a way that does not disclose information about other users’ private data.
 *
 * Input validation is minimal because the route identifies the target session record. The implementation should validate the session identifier format as a UUID and then perform a single-row lookup by the session primary key.
 *
 * Successful responses return the stored session metadata, including the captured IP, href, referrer, created timestamp, and expiration timestamp, enabling downstream authorization logic and auditing behaviors that rely on session context.
 *
 * Related operations: protected todo/profile endpoints depend on session validity checks; those endpoints should not assume they can access another member’s session by identifier, and must instead rely on acting-member scoping enforced by this and related access control mechanisms.
 *
 * @param props.connection
 * @param props.sessionId Target session identifier (UUID) for the authenticated-member session record to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor guest
 * @x-autobe-specification Implementation steps:
 * 1) Extract `sessionId` from path.
 * 2) Validate `sessionId` as UUID.
 * 3) Obtain the acting member identity from the authentication/session context available to the service layer.
 * 4) Query `multi_user_todo_member_sessions` where `id = sessionId`.
 * 5) Enforce ownership: ensure `multi_user_todo_member_id` matches the acting member id. If mismatch or no row, reject with the system’s unified unauthorized/credential-style error semantics (do not reveal whether the session exists for another member).
 * 6) Return a single DTO representing the session record, mapping columns: id, multi_user_todo_member_id (as the owning member reference in the DTO if the DTO shape includes it), ip, href, referrer, created_at, expired_at.
 *
 * Edge cases:
 * - Non-UUID `sessionId`: reject as validation failure.
 * - Expired session: the operation is still a lookup, but downstream consumers using it for authentication must treat it as invalid if `expired_at` is in the past; do not extend validity via this endpoint.
 *
 * No transaction is required because this endpoint is read-only.
 * @path /multiUserTodo/guest/sessions/:sessionId
 * @accessor api.functional.multiUserTodo.guest.sessions.at
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
     * Target session identifier (UUID) for the authenticated-member session record to retrieve.
     */
    sessionId: string & tags.Format<"uuid">;
  };
  export type Response = IMultiUserTodoMemberSession;

  export const METADATA = {
    method: "GET",
    path: "/multiUserTodo/guest/sessions/:sessionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/multiUserTodo/guest/sessions/${encodeURIComponent(props.sessionId ?? "null")}`;
  export const random = (): IMultiUserTodoMemberSession =>
    typia.random<IMultiUserTodoMemberSession>();
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
