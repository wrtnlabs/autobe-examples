import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerSession } from "../../../../structures/IPageIShoppingMallSellerSession";
import { IShoppingMallCustomerSession } from "../../../../structures/IShoppingMallCustomerSession";
import { IShoppingMallSellerSession } from "../../../../structures/IShoppingMallSellerSession";

/**
 * Retrieve a filtered and paginated list of authenticated platform sessions for governance and security oversight.
 *
 * This operation provides a unified browsing view over the dedicated actor-session tables used by the shopping mall platform: customer sessions, seller sessions, administrator sessions, and super administrator sessions. Each stored record represents an authenticated login instance and preserves the connection context captured at session creation time, including the client IP address, originating href, HTTP referrer, creation timestamp, and expiration timestamp. The endpoint is intended for operational review of access history and current authenticated presence rather than for performing sign-in, logout, or token lifecycle actions.
 *
 * Access to this operation must be restricted to administrative actors with platform oversight responsibilities. The returned data spans multiple identities and therefore is not a self-service account endpoint for customers or sellers. The operation supports security review use cases such as locating recent sessions for a given actor category, investigating sessions created from a specific IP address, identifying expired versus currently valid sessions, and reviewing access activity during a time window.
 *
 * The underlying data comes from append-oriented security tables rather than mutable business-domain records. The customer session model stores authenticated login sessions for registered customers and captures the owner customer account reference together with IP, href, referrer, created_at, and expired_at. The seller, administrator, and super administrator session models follow the same dedicated actor-session pattern for their respective actor tables. Because the platform separates session data by actor type, this API must present a normalized result while preserving the source actor category so reviewers can understand which authority boundary each session belongs to.
 *
 * Clients should use this operation when they need list browsing behavior with filters, pagination, and sorting, not when they need to retrieve one session by identifier or manipulate authentication state. If a governance workflow later needs a detail endpoint for a single session record, that should be modeled as a separate GET operation. This index operation is optimized for search and oversight screens where administrators review many session rows, narrow by criteria, and inspect recent access activity.
 *
 * Expected behavior includes rejecting unauthorized callers, validating filter values, and returning a stable paginated result ordered by explicit sort criteria with a sensible default such as newest session creation first. The operation must not fabricate session records, alter expiration timestamps, or expose credentials. It returns only the session metadata needed for auditing and oversight as represented by the session schema comments and fields.
 *
 * @param props.connection
 * @param props.body Session search criteria and pagination parameters
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a unified session search service for
 *   administrator and superAdministrator actors only.
 *
 * Accept an IShoppingMallSession.IRequest body containing pagination, filtering, and sorting inputs. Supported filters should include actorType (customer, seller, administrator, superAdministrator), ownerId, sessionId, ip, createdAt range, expiredAt range, and a validity selector derived from current time versus expired_at. Do not require every filter; treat omitted filters as broad search conditions.
 *
 * Query the four session tables separately: shopping_mall_customer_sessions, shopping_mall_seller_sessions, shopping_mall_administrator_sessions, and shopping_mall_super_administrator_sessions. Project each source into a normalized shape containing at minimum session id, actorType, ownerId, ip, href, referrer, createdAt, expiredAt, and a computed isExpired flag. If owner-display information is required by the DTO design, join only the corresponding parent actor table for the matching source table. Do not mix actor tables incorrectly.
 *
 * Merge the projected datasets into a single logical result set. Apply request filters in the database layer where practical before unioning, or in a composable query abstraction that preserves correctness and performance. Apply sorting consistently across the normalized result set. Default sorting should prioritize created_at descending unless the request explicitly specifies another supported field and direction.
 *
 * Return paginated data as IPageIShoppingMallSession.ISummary. Include standard pagination metadata and only the page slice requested by the client. The implementation must be read-only: it must not create, revoke, refresh, or delete sessions.
 *
 * Validation rules: reject callers without administrator-grade authority; reject unsupported actorType or sort fields; reject malformed UUID filters when UUID-based identifiers are supplied; normalize time-range validation so an invalid range causes request rejection; and ensure that expired versus active filtering is computed from expired_at relative to the current server timestamp in Asia/Seoul-aware application time handling where relevant.
 *
 * Error handling: return not authorized for non-admin actors, bad request for invalid filters, and an empty paginated data set when no sessions match. Avoid leaking sensitive identity or credential information beyond the session metadata explicitly represented by the normalized response DTO.
 * @path /shoppingMall/customer/sessions
 * @accessor api.functional.shoppingMall.customer.sessions.index
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
     * Session search criteria and pagination parameters
     */
    body: IShoppingMallSellerSession.IRequest;
  };
  export type Body = IShoppingMallSellerSession.IRequest;
  export type Response = IPageIShoppingMallSellerSession.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/sessions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/sessions";
  export const random = (): IPageIShoppingMallSellerSession.ISummary =>
    typia.random<IPageIShoppingMallSellerSession.ISummary>();
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
 * Retrieve one authenticated customer session record by its identifier.
 *
 * This operation returns the detailed state of a single record from the customer session store represented by the shopping_mall_customer_sessions table. That table is described as storing per-login customer session records used to audit access history and enforce session expiration for registered customer accounts. The returned resource therefore represents one concrete sign-in instance, including the client connection context captured at session creation such as the IP address, application href, referrer, creation timestamp, and expiration timestamp.
 *
 * Access to this operation is restricted to an authenticated customer acting within the context of that customer’s own account. The session requirements state that a signed-in customer uses the platform through an authenticated session and that customer-facing functions require signed-in customer access rather than guest access. In the same ownership-oriented pattern, this endpoint must not expose another customer’s session record to a different customer, and it must reject requests that are not backed by an active customer account context.
 *
 * The underlying database model links each session record to exactly one customer account through shopping_mall_customer_id and uses the session record id as the primary identifier. Although the customer foreign key is essential for authorization and ownership checks, the API path uses only the session identifier because the session record itself is globally unique. Implementations should still verify that the located record belongs to the currently authenticated customer before returning it.
 *
 * This operation is complementary to logout behavior but does not itself end a session. The logout workflow ends the current authenticated session and prevents continued use of protected features through that ended session. By contrast, this endpoint is read-only and exists for session inspection, confirmation, or account-side security visibility. If the target session does not exist, is not owned by the current customer, or the requester is not authenticated as a customer, the system must deny the request without exposing protected session details.
 *
 * @param props.connection
 * @param props.sessionId Target customer session record identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Load the customer session record from
 *   shopping_mall_customer_sessions by primary key id using the provided
 *   sessionId.
 *
 * Before returning data, require an authenticated customer session context. Resolve the current customer account identity from authentication middleware, then compare it against shopping_mall_customer_sessions.shopping_mall_customer_id on the loaded record. If there is no authenticated customer context, reject the request as unauthorized. If the record does not exist, return a not-found error. If the record exists but belongs to a different customer account, reject the request as forbidden or not found according to the platform’s security policy to avoid cross-account disclosure.
 *
 * Map the persisted fields directly into the response DTO: id, shopping_mall_customer_id relationship-derived ownership context as represented by the DTO design, ip, href, referrer, created_at, and expired_at. Do not mutate session state during this read operation. Do not terminate the session, extend expiration, or alter audit fields.
 *
 * Ensure the implementation treats deleted or invalidated account state consistently with authentication middleware. If the current account is no longer active and therefore should not retain platform access, the request must fail before data retrieval is completed. Log access according to platform auditing practices if session inspection events are tracked separately, but do not create additional business records in this operation.
 * @path /shoppingMall/customer/sessions/:sessionId
 * @accessor api.functional.shoppingMall.customer.sessions.at
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
     * Target customer session record identifier
     */
    sessionId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallCustomerSession;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/sessions/:sessionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/sessions/${encodeURIComponent(props.sessionId ?? "null")}`;
  export const random = (): IShoppingMallCustomerSession =>
    typia.random<IShoppingMallCustomerSession>();
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
