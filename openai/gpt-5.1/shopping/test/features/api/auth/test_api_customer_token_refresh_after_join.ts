import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

/**
 * Validate that a newly joined customer can immediately refresh their JWT
 * tokens.
 *
 * Business intent:
 *
 * - Ensure that the join flow issues a usable refresh token.
 * - Confirm that calling the refresh endpoint with that token produces a new
 *   authorized payload for the same customer without duplicating the account.
 * - Verify token rotation and non-regression in token lifetime semantics.
 *
 * High level steps:
 *
 * 1. Join as a new customer to obtain an initial IShoppingMallCustomer.IAuthorized
 *    payload.
 * 2. Extract the refresh token from the join response.
 * 3. Call the refresh endpoint with that refresh token.
 * 4. Assert identity invariants and token rotation expectations.
 */
export async function test_api_customer_token_refresh_after_join(
  connection: api.IConnection,
) {
  // 1. Register (join) a new customer and get initial authorized payload.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // 2. Extract the refresh token from join response.
  const originalToken: IAuthorizationToken = joined.token;

  // 3. Call refresh endpoint with extracted refresh token.
  const refreshRequestBody = {
    refreshToken: originalToken.refresh,
  } satisfies IShoppingMallCustomerRefresh.IRequest;

  const refreshed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(refreshed);

  // 4. Identity invariants between joined and refreshed payloads.
  TestValidator.equals(
    "customer id must remain the same after refresh",
    refreshed.id,
    joined.id,
  );

  TestValidator.equals(
    "customer email must remain the same after refresh",
    refreshed.email,
    joined.email,
  );

  TestValidator.equals(
    "customer status must remain the same after refresh",
    refreshed.status,
    joined.status,
  );

  TestValidator.equals(
    "email_verified flag must remain the same after refresh",
    refreshed.email_verified,
    joined.email_verified,
  );

  TestValidator.equals(
    "created_at must remain the same after refresh",
    refreshed.created_at,
    joined.created_at,
  );

  TestValidator.equals(
    "deleted_at must remain the same after refresh",
    refreshed.deleted_at ?? null,
    joined.deleted_at ?? null,
  );

  // We do not strictly constrain updated_at semantics, but we can check
  // that it is not earlier than created_at using lexical comparison of
  // ISO-8601 strings.
  TestValidator.predicate(
    "refreshed.updated_at must be greater than or equal to created_at",
    refreshed.updated_at >= refreshed.created_at,
  );

  // 5. Token rotation expectations.
  const refreshedToken: IAuthorizationToken = refreshed.token;

  TestValidator.predicate(
    "at least one of access or refresh token must be rotated on refresh",
    refreshedToken.access !== originalToken.access ||
      refreshedToken.refresh !== originalToken.refresh,
  );

  // 6. Token lifetime monotonicity (best-effort checks).
  TestValidator.predicate(
    "refreshed access token expiration must not be earlier than original",
    refreshedToken.expired_at >= originalToken.expired_at,
  );

  TestValidator.predicate(
    "refreshed refresh token lifetime must not be earlier than original",
    refreshedToken.refreshable_until >= originalToken.refreshable_until,
  );
}
