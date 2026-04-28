import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingManager } from "../../../structures/IHrmTimeTrackingManager";
import { IPageIHrmTimeTrackingManager } from "../../../structures/IPageIHrmTimeTrackingManager";

/**
 * Retrieve a filtered and paginated list of manager account records.
 *
 * This operation provides administrative visibility into authenticated manager account identities in the HRM time tracking platform. It is designed for list browsing scenarios where an authorized user needs to search, sort, and page through manager accounts using structured criteria. The underlying entity is based on the `hrm_time_tracking_managers` table, which stores the core login identity and credential lifecycle for manager users, including the unique sign-in email address and the account creation, update, and deletion timestamps. Because the table is intentionally limited to authentication and lifecycle fields, this endpoint should be understood as a manager-account listing API rather than a complete organizational profile or employee directory API.
 *
 * Access to this operation must respect organization-scoped authority evaluation. The platform requirements state that permissions are evaluated separately for the currently selected organization, and a permission granted in another organization must not affect access in the active one. For that reason, this list operation must only be available to actors who are allowed to review manager-related records in the current organization context, such as owners and appropriately authorized managers. Employees must not gain manager-management visibility through this endpoint. If the caller lacks the required authority in the selected organization, the request must be rejected.
 *
 * The returned data should be optimized for list views rather than full account recovery or authentication workflows. Consumers should use this operation to browse manager summaries, typically by filtering on searchable manager account attributes such as the unique email address and by sorting over lifecycle timestamps such as creation and last update time. The `deleted_at` lifecycle field may be relevant for administrative filtering so that authorized users can distinguish active manager accounts from records that have been removed from authentication use. However, this endpoint must not expose or implement password handling logic beyond what is already represented indirectly by the existence of manager account records.
 *
 * This operation should be used together with more specific manager detail or related organization membership endpoints if the client needs richer business context. The manager account table description explicitly notes that organization membership, employee business records, active organization context, password reset flows, session records, and profile data are maintained by other dedicated models. Therefore, this endpoint should not be treated as a substitute for employee, role, or session inspection APIs. It is best suited for secure administrative browsing of manager account identities and their lifecycle state.
 *
 * Expected failures include authorization denial when the caller lacks the necessary permission in the current organization context, rejection of malformed filter or pagination inputs, and safe refusal of any request that would imply cross-organization data mixing. Since no external user-facing integration is defined for this platform, the operation should execute entirely against internal platform data and must not depend on any third-party integration behavior.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting options for manager accounts
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a paginated search over
 *   the `hrm_time_tracking_managers` table.
 *
 * Accept an `IHrmTimeTrackingManager.IRequest` body containing list-browsing controls such as pagination, sorting, and filter criteria. Build a query that reads from `hrm_time_tracking_managers` and supports filtering by exact or partial `email` matches and by lifecycle ranges or flags derived from `created_at`, `updated_at`, and `deleted_at` when those filters are present in the request DTO. Apply deterministic sorting with a stable secondary order on `id` to ensure pagination consistency.
 *
 * Before executing the query, resolve the caller's actor identity and currently selected organization context. Enforce organization-scoped authorization according to the active organization only. Allow the operation only for actors permitted to inspect manager-related records in that current organization context. Reject the request if the caller is an employee without the required authority or if the caller's permission exists only in a different organization context.
 *
 * Return a paginated `IPageIHrmTimeTrackingManager.ISummary` result. Each item should expose only summary-safe manager account fields needed for administrative browsing, derived strictly from the manager schema and any explicitly related read model fields defined elsewhere. Do not include password hashes or any secret credential material in the response. Treat `deleted_at` as lifecycle state information that may be surfaced in summary form when appropriate for administrative visibility.
 *
 * Validate request-body pagination and sorting inputs before query execution. Reject unsupported sort keys or malformed filter values. Keep the implementation read-only and non-transactional except for any minimal consistency guarantees needed by the persistence layer. Do not invoke external integrations, and do not synthesize organization membership data from unrelated organizations. If no matching records exist, return an empty page structure rather than an error.
 * @path /hrmTimeTracking/managers
 * @accessor api.functional.hrmTimeTracking.managers.index
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
     * Search criteria, pagination, and sorting options for manager accounts
     */
    body: IHrmTimeTrackingManager.IRequest;
  };
  export type Body = IHrmTimeTrackingManager.IRequest;
  export type Response = IPageIHrmTimeTrackingManager.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/managers",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/managers";
  export const random = (): IPageIHrmTimeTrackingManager.ISummary =>
    typia.random<IPageIHrmTimeTrackingManager.ISummary>();
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
 * Retrieve the detailed record for a single manager account in the HRM time tracking platform.
 *
 * This operation returns the manager account resource identified by the `managerId` path parameter. The underlying `hrm_time_tracking_managers` table is described as the authenticated manager account record store for the platform, and it contains only the manager's core authentication and lifecycle information. In particular, it stores the unique sign-in email address, the hashed password state used for authentication, and lifecycle timestamps such as creation, update, and deletion markers. Because the table is intentionally limited to core account data, this endpoint is for manager account detail retrieval and must not be interpreted as a source of organization membership, employee profile, role assignment, active organization context, password reset history, or session information.
 *
 * Access to this operation must be evaluated within the currently selected organization context. The requirements state that manager authority is organization-scoped, that permissions are evaluated separately for each organization, and that a role from another organization must not grant access in the current one. As a result, the service should authorize the request only when the caller has sufficient permission in the active organization to view this manager account record. Manager authority is supervisory rather than absolute, so the operation must not imply unrestricted platform-wide visibility. Employees without explicit authority to view manager account records must be denied.
 *
 * This endpoint is closely related to other account and organization-management APIs, but it has a narrow responsibility. Clients that need organization membership, role selection, employee directory information, or invitation workflow state should use the corresponding organization, role, employee, invitation, or session-oriented operations instead of relying on this endpoint. This separation follows the database design, where the manager account table is isolated from organization HR records and other operational entities.
 *
 * On successful retrieval, the API returns the detailed manager DTO for the requested account. If the manager record does not exist, is not visible in the caller's current organization context, or the caller lacks permission, the request must fail rather than exposing whether unrelated cross-organization data exists. Implementations should also ensure that sensitive credential storage details are never exposed beyond the contract represented by the response DTO.
 *
 * @param props.connection
 * @param props.managerId Target manager account ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Load the manager account from
 *   `hrm_time_tracking_managers` by primary key `id` using the `managerId` path
 *   parameter.
 *
 * Before returning data, resolve the caller's current organization context and evaluate authorization in that context only. Do not grant access based on permissions the caller holds in a different organization. Allow the operation only for callers with organization-scoped authority to view manager account information, such as appropriately authorized owners or managers in the selected organization. Reject unauthorized callers.
 *
 * Query a single row where `id = :managerId`. Treat `managerId` as a UUID string. If no row exists, return a not-found error. If the service enforces lifecycle visibility, exclude records whose `deleted_at` is set from normal detail retrieval unless a separate administrative requirement explicitly allows viewing deactivated accounts.
 *
 * Map the result to `IHrmTimeTrackingManager`. The implementation must use only fields that belong to the manager account aggregate represented by this DTO and must not enrich the response with organization membership, role catalog, employee directory, session, or password reset information unless those are defined inside the DTO contract by separate schema generation. Never expose `password_hash` as a raw API field if the DTO excludes it. Preserve timestamp fidelity for `created_at`, `updated_at`, and any allowed lifecycle metadata.
 *
 * Return the detailed manager resource on success. For failures, handle invalid UUID format as a validation error, missing record as not found, and insufficient permission as forbidden. Ensure error behavior does not leak cross-organization existence information.
 * @path /hrmTimeTracking/managers/:managerId
 * @accessor api.functional.hrmTimeTracking.managers.at
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
     * Target manager account ID
     */
    managerId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingManager;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/managers/:managerId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/managers/${encodeURIComponent(props.managerId ?? "null")}`;
  export const random = (): IHrmTimeTrackingManager =>
    typia.random<IHrmTimeTrackingManager>();
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
      assert.param("managerId")(() => typia.assert(props.managerId));
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
