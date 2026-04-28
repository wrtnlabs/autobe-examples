import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOrganization } from "../../../structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOwner } from "../../../structures/IHrmTimeTrackingOwner";
import { IPageIHrmTimeTrackingOrganization } from "../../../structures/IPageIHrmTimeTrackingOrganization";

/**
 * Retrieve a filtered and paginated list of organizations accessible to the authenticated owner actor.
 *
 * This operation provides an owner-oriented browsing surface over organization tenant records in the HRM time tracking platform. The underlying organization entity represents a distinct business tenant and the primary business space in which workforce administration, projects, time tracking activities, reports, dashboards, and activity history are managed. The response is based on the organization record fields that define tenant identity and operating preferences, including the organization name shown throughout the workspace, the optional description used to express business context, the optional logo image URI for workspace branding, the default currency code, the IANA timezone identifier, and the fiscal start month.
 *
 * Access to this operation must be interpreted within the authenticated owner's organization context. The platform treats each organization as an independent business tenant, and organization-scoped access must be evaluated separately for each current workspace context. As a result, this operation must only return organization records that the authenticated owner is entitled to browse, and it must never expose records from unrelated organizations. This is consistent with the requirement that organization data, permissions, and operational records remain isolated between organizations even when the same user participates in multiple organizations.
 *
 * The operation is suitable for interfaces that need to search or browse organization workspaces available to an owner, such as workspace switchers, owner landing views, or owner-facing administration lists. Consumers that need to inspect or edit the active workspace settings in detail should use the dedicated single-resource organization settings operations associated with the current organization context. Those settings include organization name, description, logo image, currency, timezone, and fiscal start month, and only organization owners may modify them.
 *
 * Search behavior should support standard list browsing expectations such as pagination, optional keyword filtering, and deterministic sorting. Deleted organization records, represented by the deleted_at timestamp on the organization table, must not be surfaced as active organizations in normal results. If the caller lacks owner-level authorization for organization administration in the current context, the request must be rejected rather than partially fulfilled.
 *
 * @param props.connection
 * @param props.body Organization search criteria and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as an owner-authorized
 *   paginated search over hrm_time_tracking_organizations.
 *
 * Authenticate the caller as an owner actor and reject unauthenticated or non-owner callers. Build a query against hrm_time_tracking_organizations that excludes records whose deleted_at is not null unless the request DTO explicitly supports historical visibility and such behavior is later authorized by requirements. The baseline implementation should only return active organizations.
 *
 * Use the request body type IHrmTimeTrackingOrganization.IRequest to accept pagination, search, and sorting criteria. Support keyword filtering against organization name and, when useful, organization description. Sorting should be deterministic and should default to a stable order such as updated_at descending and id ascending as a tiebreaker. Return paginated results using IPageIHrmTimeTrackingOrganization.ISummary.
 *
 * The service layer must enforce organization isolation. Results must be restricted to organizations the authenticated owner can access, using owner-to-organization ownership linkage available in the application domain. Do not infer global platform-wide visibility for owners. If ownership linkage cannot be resolved for the caller, return an empty page rather than exposing unrelated organizations.
 *
 * For each returned row, map organization identity and settings summary fields from hrm_time_tracking_organizations, including id, name, description, logo_uri, currency_code, timezone, fiscal_start_month, created_at, and updated_at as appropriate for the summary DTO. Avoid loading unrelated aggregate data from other organization-scoped tables unless the summary schema explicitly requires it.
 *
 * Error handling must reject requests from callers without valid owner authorization and must preserve tenant isolation in all failure paths. No external integration behavior is required because the current requirements explicitly state that no user-facing integration operations are in scope for this platform.
 * @path /hrmTimeTracking/owners
 * @accessor api.functional.hrmTimeTracking.owners.index
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
     * Organization search criteria and pagination options
     */
    body: IHrmTimeTrackingOrganization.IRequest;
  };
  export type Body = IHrmTimeTrackingOrganization.IRequest;
  export type Response = IPageIHrmTimeTrackingOrganization.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/owners",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/owners";
  export const random = (): IPageIHrmTimeTrackingOrganization.ISummary =>
    typia.random<IPageIHrmTimeTrackingOrganization.ISummary>();
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
 * Retrieve the detailed owner account record for a specific owner identifier within the currently selected organization context.
 *
 * This operation provides administrative read access to an owner identity that is used by the HRM time tracking platform to authenticate organization owner actors. The underlying owner record is stored in the `hrm_time_tracking_owners` table, which is described as the global authenticated identity for owner actors and contains credential and account-state metadata such as the unique login email address, the most recent successful login timestamp, deactivation timestamp, creation timestamp, update timestamp, and deletion timestamp. Although the persistence model includes credential storage fields, this API is intended for ownership administration and account inspection rather than authentication workflows, so sensitive credential material must not be exposed to API consumers.
 *
 * Security for this operation must follow the organization-scoped authority model defined in the requirements. An owner is the highest-authority built-in role inside an organization, but that authority is not global across all organizations. Accordingly, the system must evaluate the caller's permissions in the currently selected organization and allow this operation only when the caller has owner-level access in that organization. In addition, the requested owner record must be proven relevant to the current organization context through the organization ownership relationship; the API must not permit using a valid owner identifier to inspect an owner account that is unrelated to the selected organization.
 *
 * This operation is closely related to organization ownership and administration features. It may be used together with organization detail and ownership-management flows when an authorized owner needs to inspect which owner identity is associated with the active tenant. If a client needs a broader set of owner records, that should be handled by a separate list operation rather than by repeated misuse of this detail endpoint. If the owner record does not exist, has been marked deleted, or is not associated with the current organization through the ownership linkage, the request must be rejected.
 *
 * Expected behavior includes loading the owner account by its primary identifier, validating organization scope through the ownership relation, and returning a consumer-safe owner representation. Error handling must deny access when the caller is not an owner in the current organization, when the selected organization context is missing, or when the requested identifier does not resolve to an accessible owner record. This preserves the tenant boundary model in which each organization remains an independent business environment with separate records and authority decisions.
 *
 * @param props.connection
 * @param props.ownerId Target owner account identifier within the current organization scope
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service method that retrieves
 *   one owner account from `hrm_time_tracking_owners` by primary key `id` and
 *   validates that the target owner is linked to the caller's currently
 *   selected organization through the ownership association modeled by the
 *   already loaded ownership relationship schema.
 *
 * Processing steps:
 * 1. Resolve the caller's current organization context from the authenticated session and authorization layer.
 * 2. Verify that the caller has owner authority in that organization. Reject if the caller is not an owner for the selected organization.
 * 3. Query the ownership relation to confirm that `ownerId` belongs to the current organization. Do not rely on the owner table alone for authorization because owner identities are global actor records while authority is organization-scoped.
 * 4. Load the matching row from `hrm_time_tracking_owners` using `id = :ownerId` and ensure the record is not logically deleted by checking `deleted_at IS NULL` unless the platform's internal read policy explicitly permits historical retrieval. For this API, return not found when the record is deleted or inaccessible.
 * 5. Map the persisted entity to `IHrmTimeTrackingOwner`, excluding `password_hash` from the response payload. Include consumer-safe lifecycle data such as email, last login timestamp, deactivation timestamp, created timestamp, and updated timestamp as defined by the DTO.
 *
 * Validation and error handling:
 * - Return not found when no owner exists for the given UUID.
 * - Return not found when the owner exists but is not linked to the current organization through the ownership relation.
 * - Return forbidden when the caller lacks owner permission in the current organization.
 * - Return unauthorized when no valid authenticated organization context is available.
 * - Avoid exposing whether an inaccessible owner identifier exists in another organization.
 *
 * Implementation notes:
 * - No transaction is required for this single read unless your infrastructure standardizes all scoped authorization reads in a transaction.
 * - Use indexed lookup on the owner primary key and ownership relation indexes for efficient scope validation.
 * - Keep this operation separate from login, password reset, session, and other authentication-management behaviors.
 * @path /hrmTimeTracking/owners/:ownerId
 * @accessor api.functional.hrmTimeTracking.owners.at
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
     * Target owner account identifier within the current organization scope
     */
    ownerId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingOwner;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/owners/:ownerId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/owners/${encodeURIComponent(props.ownerId ?? "null")}`;
  export const random = (): IHrmTimeTrackingOwner =>
    typia.random<IHrmTimeTrackingOwner>();
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
      assert.param("ownerId")(() => typia.assert(props.ownerId));
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
