import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOwnerSession } from "../../../../structures/IHrmTimeTrackingOwnerSession";
import { IPageIHrmTimeTrackingOwnerSession } from "../../../../structures/IPageIHrmTimeTrackingOwnerSession";

/**
 * Retrieve a filtered and paginated list of authentication session records that are relevant to the requesting user's permitted scope.
 *
 * This operation provides a read-oriented session browsing view over the platform's authentication session data. The underlying persistence is split across the session tables for owners, managers, and employees. The owner and employee session tables explicitly store the currently selected organization workspace together with connection metadata such as the IP address, application URL, HTTP referrer, creation timestamp, expiration timestamp, and, for employee sessions, an explicit logged-out timestamp. The manager session table stores the same connection and lifetime context except for organization selection. The endpoint presents these records as a unified list suitable for security review, current-session awareness, and account access monitoring.
 *
 * Authorization for this operation must be evaluated in the currently selected organization context where applicable. The requirements state that role-based access is evaluated separately for each organization and that permissions from another organization must not influence the current operation. As a result, this endpoint must only return session rows that the caller is permitted to inspect. Employees should be limited to their own employee sessions. Owners may review organization-relevant sessions within organizations they control. Any manager access must be limited to the current organization scope and only when the caller has the required permission in that organization. Session data from another organization context must never be exposed through this operation.
 *
 * This endpoint is intentionally read-only. Session rows are part of authentication and authorization support rather than user-managed business records. The platform uses session data to support auditability, explicit logout control, expiration handling, and account lifecycle notifications such as the access-ending notice sent to active sessions when account deletion is initiated. Because of that role, this endpoint is designed for browsing and inspection rather than creation, update, or removal of session records.
 *
 * The request body should support practical browsing controls such as actor-type filtering, current organization scoping when relevant, active-versus-expired filtering based on expired_at and logged_out_at, free-text or exact matching on connection metadata when permitted, and pagination and sorting for large result sets. Results should be returned as summary records so UI clients can display session history efficiently without exposing unnecessary internal details. Error handling must deny unauthorized access, preserve organization boundaries, and return failure clearly if any dependent policy or integration check required by the surrounding platform cannot be completed safely.
 *
 * @param props.connection
 * @param props.body Session search filters and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Implement this operation as a normalized search
 *   endpoint that reads from hrm_time_tracking_owner_sessions,
 *   hrm_time_tracking_manager_sessions, and hrm_time_tracking_employee_sessions
 *   and maps them into a unified session summary projection.
 *
 * Resolve the authenticated caller first and determine the actor kind and currently selected organization context from the active authentication layer. Apply authorization before querying data. For employee callers, constrain results to rows whose hrm_time_tracking_employee_id belongs to the authenticated employee account only. For owner callers, allow organization-scoped review of rows tied to organizations the owner can access; for owner sessions use hrm_time_tracking_organization_id, and for employee sessions use the same organization column when present. For manager callers, only allow access if the caller has the relevant permission in the current organization context; otherwise reject the request. Never merge or expose rows from organizations outside the authorized scope.
 *
 * Parse IHrmTimeTrackingSession.IRequest and support filters such as actor category, organization identifier, active status, expiration state, created-at ranges, and pagination or sorting directives. Derive active status from expired_at relative to current time and, for employee sessions, from logged_out_at being null. Build per-table queries with only verified schema fields: id, actor foreign key, optional organization foreign key, ip, href, referrer, created_at, expired_at, and logged_out_at where available. Normalize each row into a common summary shape that includes sessionId, actorType, actorId, organizationId when present, connection metadata, createdAt, expiredAt, and a computed status such as active, expired, or loggedOut. If the request asks for mixed actor types, combine result sets with deterministic sorting in application logic or through a database-compatible union strategy.
 *
 * Return IPageIHrmTimeTrackingSession.ISummary with pagination metadata and summary data items. Use stable ordering, defaulting to newest createdAt first unless another allowed sort is specified. Do not mutate session state in this operation. If authorization fails, return a forbidden error. If requested organization scope is outside the caller's active access context, reject the request. If any supporting dependency required by surrounding policy checks times out or fails, return the action as failed rather than partially successful, and do not expose cross-organization data while handling the failure.
 * @path /hrmTimeTracking/owner/sessions
 * @accessor api.functional.hrmTimeTracking.owner.sessions.index
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
     * Session search filters and pagination options
     */
    body: IHrmTimeTrackingOwnerSession.IRequest;
  };
  export type Body = IHrmTimeTrackingOwnerSession.IRequest;
  export type Response = IPageIHrmTimeTrackingOwnerSession.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/owner/sessions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/owner/sessions";
  export const random = (): IPageIHrmTimeTrackingOwnerSession.ISummary =>
    typia.random<IPageIHrmTimeTrackingOwnerSession.ISummary>();
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
 * Retrieve detailed information for a single authenticated session record by its identifier.
 *
 * This operation returns the connection and lifecycle data associated with one session, including when the session was created, when it expires, and the client-origin metadata captured at sign-in such as IP address, application URL, and referrer. In the loaded session schemas, employee and owner sessions also carry the currently selected organization workspace, which reflects the requirement that all authenticated work must proceed within one active organization context and that users who belong to multiple organizations must operate only within the organization selected for the session.
 *
 * Access to this operation is restricted to authenticated actors acting within their own valid access boundary. Owners, managers, and employees may retrieve session details only for sessions they are permitted to access, and the implementation must not allow a session from another actor identity to be exposed merely by knowing its identifier. This aligns with the requirement that authenticated access is tied both to the user account and to the currently selected organization context, and that data and actions must not leak across organizations or unrelated sessions.
 *
 * This operation is closely related to login, organization context activation, organization switching, and logout behavior. A session returned by this endpoint represents the persisted state created after authentication and used to scope later work. For owner and employee sessions, the active organization context shown in the response should reflect the current workspace selection stored in the session record. For employee sessions, explicit logout state should be represented from the stored logged_out_at value so clients can determine whether the session has already been terminated.
 *
 * If the session does not exist, is expired beyond acceptable retrieval rules, or is not accessible to the requesting actor, the operation must fail rather than disclose whether another actor's session exists. The implementation must preserve organization isolation while handling lookup and error responses, ensuring that a user who belongs to multiple organizations never receives session-derived visibility into another organization's data through this endpoint.
 *
 * @param props.connection
 * @param props.sessionId Target session identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor owner
 * @x-autobe-specification Validate that sessionId is a UUID and that the caller
 *   is authenticated as one of the supported actors: owner, manager, or
 *   employee.
 *
 * Resolve the caller's actor type from the authentication context, then query only the corresponding session table for that actor: hrm_time_tracking_owner_sessions for owner callers, hrm_time_tracking_manager_sessions for manager callers, and hrm_time_tracking_employee_sessions for employee callers. Never perform a broad cross-actor lookup that could reveal the existence of another actor type's session record.
 *
 * Load the target session row by id and enforce ownership by matching the session's actor foreign key to the authenticated principal's actor id. For owner sessions, verify hrm_time_tracking_owner_id equals the authenticated owner id. For manager sessions, verify hrm_time_tracking_manager_id equals the authenticated manager id. For employee sessions, verify hrm_time_tracking_employee_id equals the authenticated employee id.
 *
 * Map the session row into a unified IHrmTimeTrackingSession response shape. Include the session id, actor-specific owner/manager/employee reference as applicable, connection metadata fields ip, href, and referrer, created_at, expired_at, and organization context when the underlying record contains hrm_time_tracking_organization_id. For employee sessions, also include logged_out_at because explicit logout state is stored in that table.
 *
 * Return the unified session detail without mutating the session. Do not switch organization context, refresh the session, or terminate the session as part of this operation. If the record is not found or does not belong to the authenticated actor, return a not-found style failure to avoid disclosing unauthorized session existence. If the caller is authenticated but not one of the supported actor contexts, reject the operation. Preserve organization isolation in any error handling and avoid exposing session data from another organization or actor scope.
 * @path /hrmTimeTracking/owner/sessions/:sessionId
 * @accessor api.functional.hrmTimeTracking.owner.sessions.at
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
     * Target session identifier
     */
    sessionId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingOwnerSession;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/owner/sessions/:sessionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/owner/sessions/${encodeURIComponent(props.sessionId ?? "null")}`;
  export const random = (): IHrmTimeTrackingOwnerSession =>
    typia.random<IHrmTimeTrackingOwnerSession>();
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
