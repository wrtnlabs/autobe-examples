import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IShoppingMallSellerAuthJoin } from "../../../structures/IShoppingMallSellerAuthJoin";
import { IShoppingMallSeller } from "../../../structures/IShoppingMallSeller";
import { IShoppingMallSellerAuthLogin } from "../../../structures/IShoppingMallSellerAuthLogin";
import { IShoppingMallSellerAuthRefresh } from "../../../structures/IShoppingMallSellerAuthRefresh";

/**
 * This API operation registers a new seller account by inserting a record into
 * the `shopping_mall_sellers` table, which is described as "Registered seller
 * accounts on the shoppingMall platform" and serves as the root identity for
 * all seller-related operations. When the request body is valid, the service
 * will generate a new `id` as the primary key, store the provided business
 * contact `email`, and compute and persist a `password_hash` derived from the
 * seller’s chosen credentials. The `status` column, which reflects lifecycle
 * states such as `pending_review`, `active`, `suspended`, or `terminated`, will
 * be initialized according to platform policy, commonly starting as
 * `pending_review` or `active`. The boolean `email_verified` flag will be
 * initialized as `false` until a separate verification process completes, and
 * the `created_at` and `updated_at` timestamps will be set to the current
 * server time while `deleted_at` remains `null` to indicate that the account is
 * logically present.
 *
 * Security-wise, this operation is intentionally public and therefore uses
 * `authorizationActor: null` combined with `authorizationType: "join"`, because
 * no authenticated seller context exists prior to registration. Despite being
 * public, it must strictly validate inputs such as `email` uniqueness using the
 * unique index on `shopping_mall_sellers.email` and enforce password strength
 * requirements before computing the `password_hash`. The implementation must
 * ensure that the plain password never leaves the application boundary
 * unencrypted and that the `password_hash` column is populated using a strong
 * one-way hashing algorithm designed for credentials.
 *
 * This join operation is tightly coupled to the underlying
 * `shopping_mall_sellers` schema. By persisting the `email`, `password_hash`,
 * and lifecycle `status`, it creates the seller identity referenced by
 * `shopping_mall_seller_sessions.shopping_mall_seller_id`,
 * `shopping_mall_actor_security_events_of_sellers.shopping_mall_seller_id`, and
 * `shopping_mall_account_risk_flags_of_sellers.shopping_mall_seller_id`. These
 * subsidiary tables rely on the seller identity to track login sessions,
 * security incidents, and risk flags associated with each merchant, giving
 * governance and risk engines a normalized anchor for all seller-related
 * events.
 *
 * In terms of validation rules and business logic, the request DTO
 * `IShoppingMallSellerAuthJoin.IRequest` will contain fields such as `email`
 * and `password`, and may include additional seller onboarding attributes as
 * defined by higher-level requirements. The service must reject registration
 * attempts when an account with the same `email` already exists, regardless of
 * the `status` or `deleted_at` values, unless business policy explicitly allows
 * reactivation flows. It should also normalize and trim incoming values before
 * comparison, and record any suspicious registration attempts using the
 * security event infrastructure if configured to do so.
 *
 * This operation is designed to be used in conjunction with the seller login
 * and refresh endpoints. After successful registration, the implementation will
 * typically issue an initial JWT access and refresh token pair encapsulated in
 * the `IShoppingMallSeller.IAuthorized` response body, and may also create a
 * new row in `shopping_mall_seller_sessions` capturing `ip`, `href`,
 * `referrer`, and `created_at` to represent the newly established authenticated
 * session. Future authentication requests to `/auth/seller/login` will validate
 * credentials against the stored `email` and `password_hash`, while
 * `/auth/seller/refresh` will rely on the refresh token originally issued from
 * this join flow.
 *
 * Error handling must clearly distinguish between validation errors (such as
 * weak passwords or duplicate emails) and server-side issues (such as database
 * write failures). Validation errors should return structured error responses
 * that do not reveal whether the `email` is already associated with an account
 * in a way that would encourage enumeration, while server-side errors should be
 * logged internally with potential creation of
 * `shopping_mall_actor_security_events` or
 * `shopping_mall_account_risk_flags_of_sellers` entries when repeated failures
 * indicate abuse patterns.
 *
 * @param props.connection
 * @param props.body Seller registration payload including email, password, and
 *   related onboarding data required to create a new row in
 *   `shopping_mall_sellers`.
 * @setHeader token.access Authorization
 *
 * @path /auth/seller/join
 * @accessor api.functional.auth.seller.join
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
     * Seller registration payload including email, password, and related
     * onboarding data required to create a new row in
     * `shopping_mall_sellers`.
     */
    body: IShoppingMallSellerAuthJoin.IRequest;
  };
  export type Body = IShoppingMallSellerAuthJoin.IRequest;
  export type Response = IShoppingMallSeller.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/seller/join",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/seller/join";
  export const random = (): IShoppingMallSeller.IAuthorized =>
    typia.random<IShoppingMallSeller.IAuthorized>();
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
 * This API operation authenticates sellers by validating credentials against
 * the `shopping_mall_sellers` table, which represents registered merchant
 * accounts and contains the primary login identifiers `email` and
 * `password_hash`, as well as account lifecycle `status`. The service reads the
 * row whose `email` matches the one provided in
 * `IShoppingMallSellerAuthLogin.IRequest`, ensuring the query respects the
 * unique index on `shopping_mall_sellers.email` to quickly locate the seller.
 * It then uses a password verification algorithm to compare the plain-text
 * password from the request with the stored `password_hash`, returning an
 * authentication failure if the check does not succeed.
 *
 * From a security perspective, this operation is the canonical seller login
 * entry point and is therefore tagged with `authorizationType: "login"` and
 * `authorizationActor: null`, exposing it publicly while performing sensitive
 * credential processing. It must enforce platform security rules that depend on
 * the `status` column of `shopping_mall_sellers`, rejecting access for
 * lifecycle states such as `suspended` or `terminated` and possibly blocking
 * `pending_review` accounts depending on business policy. It should also
 * consider the `deleted_at` column, denying login attempts for logically
 * removed seller accounts even if the underlying row still exists for audit
 * reasons.
 *
 * The login flow integrates directly with subsidiary session tracking in the
 * `shopping_mall_seller_sessions` table. After successful authentication, the
 * implementation typically inserts a new row in `shopping_mall_seller_sessions`
 * referencing the seller via `shopping_mall_seller_id`, storing contextual
 * metadata like `ip`, `href`, `referrer`, and the `created_at` timestamp. The
 * `expired_at` field will remain `null` until the session is invalidated or
 * naturally expires, allowing security and analytics tooling to query active
 * and historical sessions based on the `shopping_mall_seller_id` and
 * `created_at` index.
 *
 * Additionally, repeated failed login attempts and high-risk behaviors surfaced
 * during credential validation may be recorded as security events in tables
 * such as `shopping_mall_actor_security_events_of_sellers`, which in turn
 * attach to a shared `shopping_mall_actor_security_events` record via
 * `shopping_mall_actor_security_event_id`. Corresponding
 * `shopping_mall_account_risk_flags_of_sellers` rows may be added when risk
 * scores cross thresholds, linking the risk flag to the seller with
 * `shopping_mall_seller_id` and time-stamping the event in `created_at`. These
 * linkages allow governance and risk systems to reason about the seller’s
 * authentication risk posture over time.
 *
 * The response body `IShoppingMallSeller.IAuthorized` aggregates the
 * authenticated seller’s identity derived from `shopping_mall_sellers` and the
 * newly issued JWT tokens (access and refresh) that encode this identity and
 * its permissions. Clients will use the access token for subsequent
 * authenticated seller API calls and the refresh token with
 * `/auth/seller/refresh` to maintain session continuity. Error handling must
 * remain careful not to disclose whether the `email` is registered, and
 * business-specific lockout or MFA logic should be layered on top based on the
 * contents of the security event and risk flag tables.
 *
 * @param props.connection
 * @param props.body Seller login credentials (email and password) to be
 *   verified against `shopping_mall_sellers.password_hash`.
 * @setHeader token.access Authorization
 *
 * @path /auth/seller/login
 * @accessor api.functional.auth.seller.login
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
     * Seller login credentials (email and password) to be verified against
     * `shopping_mall_sellers.password_hash`.
     */
    body: IShoppingMallSellerAuthLogin.IRequest;
  };
  export type Body = IShoppingMallSellerAuthLogin.IRequest;
  export type Response = IShoppingMallSeller.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/seller/login",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/seller/login";
  export const random = (): IShoppingMallSeller.IAuthorized =>
    typia.random<IShoppingMallSeller.IAuthorized>();
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
 * This API operation renews a seller’s authenticated context by accepting a
 * refresh token packaged in `IShoppingMallSellerAuthRefresh.IRequest` and
 * issuing a new authorized seller response of type
 * `IShoppingMallSeller.IAuthorized`. Rather than validating an email and
 * `password_hash` like the login endpoint, it validates the refresh token’s
 * signature, expiration, and revocation status, then resolves the associated
 * seller identity from the `shopping_mall_sellers` table. It ensures that the
 * seller’s `status` still allows access (for example, it is not `suspended` or
 * `terminated`) and that the account has not been logically removed via the
 * `deleted_at` field.
 *
 * From a security standpoint, this operation is categorized with
 * `authorizationType: "refresh"` and uses `authorizationActor: null`, allowing
 * it to be called with only a refresh token rather than an existing access
 * token. Implementations must enforce strict token validation rules, honoring
 * revocation lists or blacklists and respecting the configured session
 * lifetime. If the refresh token is tied to a specific login session stored in
 * `shopping_mall_seller_sessions`, the operation must verify that the session
 * identified by `shopping_mall_seller_id` and any internal token/session
 * identifier has not reached its `expired_at` time, and may update that session
 * or record a new one depending on the session model.
 *
 * The refresh flow is closely integrated with the broader seller authentication
 * lifecycle encompassing join and login. Sellers created via
 * `/auth/seller/join` and authenticated via `/auth/seller/login` receive
 * refresh tokens that point back to their identity in `shopping_mall_sellers`
 * and possibly to a row in `shopping_mall_seller_sessions`. When this endpoint
 * is called, it reconstructs the seller’s authorized context, re-deriving
 * claims from the seller row, such as their unique `id` and current `status`,
 * and then issues a fresh set of tokens as `IShoppingMallSeller.IAuthorized`.
 * This allows long-lived sessions without requiring passwords to be sent
 * frequently, while still enabling platform operators to revoke or limit access
 * by updating the seller’s status or invalidating sessions.
 *
 * The risk and security infrastructure around seller accounts may also
 * influence the behavior of this endpoint. For example, if there are recent
 * high-severity security events linked via
 * `shopping_mall_actor_security_events_of_sellers` or critical flags recorded
 * in `shopping_mall_account_risk_flags_of_sellers` for the seller’s
 * `shopping_mall_seller_id`, the implementation may refuse to refresh tokens
 * and instead demand a full reauthentication or escalate to manual review.
 * These tables provide time-stamped linkages (`created_at`) that enable policy
 * engines to make decisions based on recent activity.
 *
 * Error handling for the refresh operation must intentionally avoid leaking
 * sensitive information about token internals or seller existence. Invalid or
 * expired tokens, revoked sessions, or disallowed seller statuses should result
 * in a generic unauthorized or forbidden response, while internal logs capture
 * detailed context for audit and risk analysis. By relying on the normalized
 * structures of `shopping_mall_sellers`, `shopping_mall_seller_sessions`,
 * `shopping_mall_actor_security_events_of_sellers`, and
 * `shopping_mall_account_risk_flags_of_sellers`, the implementation can
 * maintain a robust, auditable seller authentication lifecycle.
 *
 * @param props.connection
 * @param props.body Refresh token and related context used to renew the
 *   seller’s JWT tokens without re-supplying credentials.
 * @setHeader token.access Authorization
 *
 * @path /auth/seller/refresh
 * @accessor api.functional.auth.seller.refresh
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
     * Refresh token and related context used to renew the seller’s JWT
     * tokens without re-supplying credentials.
     */
    body: IShoppingMallSellerAuthRefresh.IRequest;
  };
  export type Body = IShoppingMallSellerAuthRefresh.IRequest;
  export type Response = IShoppingMallSeller.IAuthorized;

  export const METADATA = {
    method: "POST",
    path: "/auth/seller/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/seller/refresh";
  export const random = (): IShoppingMallSeller.IAuthorized =>
    typia.random<IShoppingMallSeller.IAuthorized>();
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
