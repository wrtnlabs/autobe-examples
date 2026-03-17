import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSuperAdministrator } from "../../../structures/IPageIShoppingMallSuperAdministrator";
import { IShoppingMallSuperAdministrator } from "../../../structures/IShoppingMallSuperAdministrator";

/**
 * Retrieve a filtered and paginated list of super administrator accounts that hold the highest level of platform governance authority.
 *
 * This operation is used to browse the canonical authenticated identity records stored in the shopping_mall_super_administrators table. That table represents the most privileged administrative actor in the platform and contains the email-based credential identity, lifecycle state, and timestamps used to control top-level governance access. In business terms, these records correspond to the actors who stand above regular administrators in the platform hierarchy and who retain authority over administrator admission and administrative grade changes.
 *
 * Access to this operation must be tightly restricted because super administrators are the final administrative authority for platform governance. The response is intended for authorized governance workflows and administrative visibility, not for storefront usage, buying activity, or seller operations. The implementation must never expose password_hash, because that column is an internal authentication secret used only for credential verification. Consumer-facing list results should expose only safe summary information such as identity, email, activity state, and operational timestamps.
 *
 * The browsing behavior should support practical governance use cases such as finding currently active super administrators, locating a specific super administrator by email, reviewing recently created or updated accounts, and optionally distinguishing records that have been deleted through the deleted_at lifecycle marker. Because the table comment explicitly describes deleted_at as the moment when deletion has occurred, normal list behavior should focus on non-deleted governance identities unless the request body explicitly asks to include deleted records for audit-oriented administration.
 *
 * This operation is related to administrator grade management workflows such as promoting an administrator to super administrator and demoting one super administrator to regular administrator. Those workflows change who appears in this list as a super administrator over time, while this endpoint provides the read-side browsing surface for governance users who need visibility into the current super administrator population. It can therefore be used before or after such role-management actions to confirm the current hierarchy state.
 *
 * If the caller is not authenticated as a super administrator, the platform must deny access. If filters are invalid, sort keys are unsupported, or pagination values are out of range, the request must be rejected without changing any stored records. Successful execution returns a paginated result optimized for browsing, not a full credential record.
 *
 * @param props.connection
 * @param props.body Search filters, sorting, and pagination for super administrator accounts
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a paginated search over the shopping_mall_super_administrators table.
 *
 * Accept an IShoppingMallSuperAdministrator.IRequest body containing pagination, filtering, and sorting directives. Support filters grounded only in actual schema fields: id, email, active, created_at, updated_at, and deleted_at. Implement case-insensitive partial matching for email when text search is provided, exact matching for id when requested, exact boolean filtering for active, and range filtering for created_at and updated_at when date bounds are provided by the request DTO design. If the request model includes deleted-record controls, use deleted_at to include only active records by default and optionally include or isolate deleted records when explicitly requested.
 *
 * Construct the base query from shopping_mall_super_administrators and never join credential recovery or session tables for this endpoint unless the request DTO explicitly requires derived metadata that is documented elsewhere. Select only fields appropriate for a summary projection and never return password_hash. The summary projection should include the super administrator identifier, login email, active status, created_at, updated_at, and whether deleted_at is present, as represented by the response DTO.
 *
 * Apply deterministic sorting. Default to updated_at descending when no explicit sort is supplied, with id as a stable tiebreaker. Enforce pagination limits to prevent unbounded scans. Count the total number of matching records for pagination metadata and then fetch the requested page of summary rows.
 *
 * Before executing the query, authorize the caller as a super administrator. Reject requests from customers, sellers, regular administrators, or unauthenticated actors. Return authorization errors without revealing protected governance data. Also validate request pagination and sort parameters before hitting the database when possible.
 *
 * This operation is read-only and must not modify any records. It should be implemented without transactions unless the surrounding infrastructure requires a consistent count-and-page read strategy. If the platform uses logical deletion semantics through deleted_at, ensure the default predicate excludes deleted rows from ordinary governance browsing while preserving the ability to inspect them only through explicit filter intent defined by the request DTO.
 * @path /shoppingMall/superAdministrators
 * @accessor api.functional.shoppingMall.superAdministrators.index
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
     * Search filters, sorting, and pagination for super administrator accounts
     */
    body: IShoppingMallSuperAdministrator.IRequest;
  };
  export type Body = IShoppingMallSuperAdministrator.IRequest;
  export type Response = IPageIShoppingMallSuperAdministrator.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/superAdministrators",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/superAdministrators";
  export const random = (): IPageIShoppingMallSuperAdministrator.ISummary =>
    typia.random<IPageIShoppingMallSuperAdministrator.ISummary>();
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
 * Retrieve detailed information for a single super administrator account by its identifier.
 *
 * This operation exposes the platform governance identity of a super administrator, which the requirements define as the highest administrative role on the platform. A super administrator holds all permissions available to a regular administrator and additionally governs administrator admission and administrative grade changes. Because this role represents top-level governance authority rather than storefront participation, the returned resource is intended for administrative oversight and privileged internal management use.
 *
 * The operation targets the super administrator account record itself, not customer participation, seller participation, shopping activity, or order ownership. The loaded requirements explicitly distinguish administrative standing from customer or seller participation, meaning the retrieved data represents governance responsibility and authority level rather than commercial identity. API consumers should therefore use this endpoint when they need to inspect a specific privileged administrative identity within the platform governance domain.
 *
 * Access to this operation should be limited to authenticated administrative actors with authority to inspect platform governance records. In practice, this endpoint is most closely aligned with super administrator oversight because the same requirements establish that super administrators control administrator request review and administrative grade changes. The endpoint must not disclose privileged governance records to customers, sellers, or unauthenticated callers.
 *
 * This operation may be used together with administrative role-management workflows such as reviewing administrator requests, promoting an administrator to super administrator, or demoting another super administrator. Those workflows are separate operations and must be executed independently. This endpoint serves as the detail lookup step for confirming the current identity and authority context of the target super administrator before or after those governance actions.
 *
 * If the identified super administrator account does not exist, the system should reject the request with a not-found error. If the caller lacks sufficient governance permission, the system should deny access without revealing unnecessary privileged account information. The response should include the current super administrator account details as stored in the authoritative administrative identity record.
 *
 * @param props.connection
 * @param props.superAdministratorId Identifier of the target super administrator account
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Load the target super administrator account from the super administrator identity store using the provided superAdministratorId as the primary lookup key.
 *
 * Before querying the record, authenticate the caller and verify that the caller holds an administrative governance role permitted to view super administrator account details. Reject unauthenticated requests and reject authenticated callers that do not have governance-level visibility into privileged administrative identities.
 *
 * Execute a single-record read against the super administrator table filtered by the identifier. If no record exists for the supplied identifier, return a not-found error. Do not create fallback behavior and do not infer records from administrator, customer, or seller identities because the super administrator role is a distinct governance identity.
 *
 * Return the canonical detailed DTO for the super administrator account. Include the current persisted fields that define the super administrator identity and its governance standing. The implementation must not mix customer-facing or seller-facing profile data into the response unless those fields are explicitly part of the super administrator schema.
 *
 * This operation is read-only and must not modify administrator grade assignments, request review state, sessions, passwords, or related governance audit records. Logging may record that a privileged administrative record was accessed, but the endpoint itself performs no state transition.
 * @path /shoppingMall/superAdministrators/:superAdministratorId
 * @accessor api.functional.shoppingMall.superAdministrators.at
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
     * Identifier of the target super administrator account
     */
    superAdministratorId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSuperAdministrator;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/superAdministrators/:superAdministratorId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/superAdministrators/${encodeURIComponent(props.superAdministratorId ?? "null")}`;
  export const random = (): IShoppingMallSuperAdministrator =>
    typia.random<IShoppingMallSuperAdministrator>();
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
      assert.param("superAdministratorId")(() =>
        typia.assert(props.superAdministratorId),
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
