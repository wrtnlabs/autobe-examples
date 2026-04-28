import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallAdministrator } from "../../../structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "../../../structures/IShoppingMallAdministrator";

/**
 * Retrieve a filtered and paginated roster of administrator accounts for platform governance oversight.
 *
 * This operation provides the administrative business view described for administrator account listing and oversight. It exposes the current roster of platform management accounts so authorized internal actors can understand who currently holds administrative authority and whether each account operates at the regular administrator grade or the super administrator grade. The response is intended to support operational visibility at a glance rather than customer-facing marketplace activity.
 *
 * Access to this operation is restricted to administrative actors. Regular administrators may use it to understand the current platform oversight roster across category management, seller approval oversight, product oversight, order oversight, and user access management. Super administrators use the same roster and additionally rely on it as supporting context for higher-level governance decisions such as promotion of a regular administrator to super administrator and demotion of another super administrator. The self-demotion prohibition remains part of the separate grade-management workflow and is not performed by this listing endpoint.
 *
 * The operation is backed by the administrator account entity represented by the shopping_mall_administrators table, which stores administrator identities for elevated platform governance access. The listing may also surface the effective grade state associated with each administrator account so that consumers can distinguish ordinary oversight accounts from the accounts that hold highest-level administrative grade control. Although administrator grade changes are audited through separate governance records, this endpoint is focused on current roster visibility and not on returning a mutation workflow or full audit history.
 *
 * Clients typically call this operation before invoking related administrative detail or grade-management endpoints. In particular, it serves as the discovery step for finding the target administrator account that may later be viewed in detail or used in a promotion or demotion workflow. Search, pagination, and sorting support are included so governance users can efficiently browse large rosters, narrow by grade or status, and review the most relevant accounts first.
 *
 * Expected behavior is to return only administrator accounts visible within platform governance scope, ordered according to request criteria, together with pagination metadata. The service should reject unauthorized callers, validate request filters and sort keys, and avoid disclosing sensitive authentication material. If no records match the criteria, the response should still return a valid empty page rather than an error.
 *
 * @param props.connection
 * @param props.body Administrator roster search and pagination criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a paginated search over
 *   the shopping_mall_administrators table.
 *
 * Accept a JSON request body of type IShoppingMallAdministrator.IRequest containing pagination, filtering, and sorting fields appropriate for administrative roster browsing. Support filters that are grounded in the business requirement for governance visibility, especially current administrator grade and general keyword search over non-secret identifying fields. Do not require path parameters. Because this is an internal roster endpoint, never expose password hashes, reset tokens, or session information in the response.
 *
 * Build the primary query from shopping_mall_administrators and project each row into IShoppingMallAdministrator.ISummary. Include fields necessary for roster visibility, such as the administrator identifier and the current grade classification that distinguishes regular administrators from super administrators. If grade is stored directly on the administrator account record, read it from that column. If any supplementary governance data is needed for presentation, load it in a read-only manner without changing the source of truth for the current account state.
 *
 * Apply pagination deterministically with validated page or limit parameters defined by the request DTO. Apply stable sorting so repeated requests produce consistent ordering. If the request includes grade filtering, limit the result set accordingly. If the request includes keyword search, search only documented non-sensitive identity fields such as administrator email or display-oriented account fields actually represented in the DTO mapping.
 *
 * Authorize only administrator and superAdministrator actors. Reject customer and seller actors with a permission error. Return an empty paginated collection when filters produce no matches. Handle malformed filter or sort input with validation errors. No database transaction is required beyond the consistency needed for a single read operation, but the count query and data query should be executed with matching predicates so pagination metadata reflects the same filter set.
 *
 * This endpoint must remain read-only. Do not perform any administrator grade mutation here, do not create audit records, and do not combine this listing with administrator request approval or promotion/demotion execution logic. Those behaviors belong to separate governance operations.
 * @path /shoppingMall/administrators
 * @accessor api.functional.shoppingMall.administrators.index
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
     * Administrator roster search and pagination criteria
     */
    body: IShoppingMallAdministrator.IRequest;
  };
  export type Body = IShoppingMallAdministrator.IRequest;
  export type Response = IPageIShoppingMallAdministrator.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/administrators",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/administrators";
  export const random = (): IPageIShoppingMallAdministrator.ISummary =>
    typia.random<IPageIShoppingMallAdministrator.ISummary>();
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
 * Retrieve detailed information for a single administrator account used in the platform’s governance roster.
 *
 * This operation returns one administrator account identified by the `shopping_mall_administrators.id` primary key. The underlying administrator table is described as the canonical administrator identity used for authentication, moderation eligibility, and audit-linked governance actions across the marketplace. The response is intended for platform oversight use cases where an administrator or super administrator needs to inspect a specific governance account rather than browse customer purchasing or seller merchandising data.
 *
 * The returned resource is grounded in the actual administrator account fields stored by the platform: the unique administrator email address used as the login identifier, the account’s active state that indicates whether the administrator is currently permitted to operate under normal governance status, the banned state that indicates whether authenticated platform access is blocked, and the lifecycle timestamps for creation, last update, and deletion status. Because the administrator schema includes `deleted_at`, the detail view should accurately represent whether the account is still present as an active governance identity or has entered a deleted lifecycle state retained for administrative traceability.
 *
 * Access to this operation should be restricted to administrative actors. The requirements describe administrator accounts as an operational roster supporting governance, oversight, and role assignment decisions, and they distinguish regular administrators from super administrators by authority boundaries. Regular administrators participate in oversight of seller approvals, categories, products, orders, and user restrictions, while super administrators additionally govern administrator-request review and administrative grade control. For that reason, this endpoint is part of the internal platform management surface and should not be available to customers or sellers.
 *
 * This operation is closely related to administrator roster and authority-management workflows. A broader administrative list view can be used before this detail endpoint to identify the target account, and separate governance operations handle promotion to super administrator or demotion back to regular administrator. If grade-oriented information is presented by the implementation, it should be derived consistently from governance records such as `shopping_mall_administrator_grade_changes`, whose rows capture previous grade, new grade, the acting super administrator, and the execution timestamp for each completed authority change.
 *
 * If the specified administrator account does not exist, is not visible under administrative governance rules, or the caller lacks the required administrative authority, the operation must fail without exposing unrelated account information. The endpoint must return only the requested administrator resource and must not disclose credential material such as the stored password hash in API output.
 *
 * @param props.connection
 * @param props.administratorId Target administrator account ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only detail retrieval for one
 *   administrator account from `shopping_mall_administrators`.
 *
 * 1. Authorize the caller as an `administrator` or `superAdministrator`. Reject customer and seller actors. Reject unauthenticated requests.
 * 2. Parse `administratorId` as a UUID and query `shopping_mall_administrators` by primary key.
 * 3. If no row exists, return a not-found error.
 * 4. Map the persisted administrator fields into the response DTO. Include identity and governance lifecycle information that is safe for API exposure, such as `id`, `email`, `active`, `banned`, `createdAt`, `updatedAt`, and deletion-state information derived from `deleted_at` if the DTO includes it. Never expose `password_hash`.
 * 5. If the response contract includes grade-oriented information, derive it from the administrative governance context rather than pretending a nonexistent column exists on `shopping_mall_administrators`. The implementation may inspect the most recent related row in `shopping_mall_administrator_grade_changes` ordered by `created_at` to determine the latest recorded promoted or demoted grade state when required by downstream DTO design.
 * 6. Preserve the distinction between current account existence and historical audit data. Grade-change records are append-only audit events and must not be modified by this read operation.
 * 7. Return the single DTO as JSON.
 *
 * Error handling:
 * - 400 when `administratorId` is not a valid UUID.
 * - 401 or 403 when the caller is not authorized for administrative governance views.
 * - 404 when the administrator record does not exist.
 * - Avoid leaking whether an email exists for unrelated accounts.
 *
 * Implementation notes:
 * - Use a simple primary-key lookup with optional secondary lookup of the latest grade-change record if grade projection is part of the DTO.
 * - No transaction is required unless the realization layer chooses to combine multiple reads under a consistent snapshot.
 * - Do not include session data or password-reset data in this endpoint; those belong to separate child resources and are not needed for the administrator detail view.
 * @path /shoppingMall/administrators/:administratorId
 * @accessor api.functional.shoppingMall.administrators.at
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
     * Target administrator account ID
     */
    administratorId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallAdministrator;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/administrators/:administratorId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/administrators/${encodeURIComponent(props.administratorId ?? "null")}`;
  export const random = (): IShoppingMallAdministrator =>
    typia.random<IShoppingMallAdministrator>();
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
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
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
