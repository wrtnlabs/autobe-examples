import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

/**
 * Verify that repeated valid refresh calls for the same customer preserve
 * identity and account status while rotating tokens and moving expiration
 * windows forward.
 *
 * Business workflow:
 *
 * 1. Register a new customer via POST /auth/customer/join and capture the initial
 *    refresh token from the returned authorized payload.
 * 2. Perform the first refresh using POST /auth/customer/refresh with the initial
 *    refresh token and capture the resulting authorized payload as auth1.
 * 3. Perform the second refresh using the refresh token from auth1 and capture the
 *    resulting authorized payload as auth2.
 * 4. Assert that identity- and status-related fields are identical between auth1
 *    and auth2.
 * 5. Assert that access tokens are rotated and that token expiration timestamps
 *    move forward monotonically.
 */
export async function test_api_customer_token_refresh_idempotent_identity(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain the initial token pair.
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  const initialToken: IAuthorizationToken = joined.token;
  const initialRefreshToken: string = initialToken.refresh;

  // 2. First refresh using the initial refresh token.
  const refreshRequest1: IShoppingMallCustomerRefresh.IRequest = {
    refreshToken: initialRefreshToken,
  };

  const auth1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshRequest1,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(auth1);

  const token1: IAuthorizationToken = auth1.token;

  // 3. Second refresh using the refresh token from auth1.
  const refreshRequest2: IShoppingMallCustomerRefresh.IRequest = {
    refreshToken: token1.refresh,
  };

  const auth2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshRequest2,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(auth2);

  const token2: IAuthorizationToken = auth2.token;

  // 4. Identity and status invariants between auth1 and auth2.
  TestValidator.equals(
    "customer id remains stable across successive refreshes",
    auth1.id,
    auth2.id,
  );

  TestValidator.equals(
    "customer email remains stable across successive refreshes",
    auth1.email,
    auth2.email,
  );

  TestValidator.equals(
    "customer status remains stable across successive refreshes",
    auth1.status,
    auth2.status,
  );

  TestValidator.equals(
    "email verification flag remains stable across successive refreshes",
    auth1.email_verified,
    auth2.email_verified,
  );

  TestValidator.equals(
    "created_at remains stable across successive refreshes",
    auth1.created_at,
    auth2.created_at,
  );

  TestValidator.equals(
    "updated_at remains stable across successive refreshes",
    auth1.updated_at,
    auth2.updated_at,
  );

  TestValidator.equals(
    "deleted_at remains stable across successive refreshes",
    auth1.deleted_at ?? null,
    auth2.deleted_at ?? null,
  );

  // 5. Token rotation and monotonic expiry.
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    token1.access,
    token2.access,
  );

  const token1ExpiredAt = new Date(token1.expired_at).getTime();
  const token2ExpiredAt = new Date(token2.expired_at).getTime();
  const token1RefreshableUntil = new Date(token1.refreshable_until).getTime();
  const token2RefreshableUntil = new Date(token2.refreshable_until).getTime();

  TestValidator.predicate(
    "access token expiration should not move backwards on successive refresh",
    token2ExpiredAt >= token1ExpiredAt,
  );

  TestValidator.predicate(
    "refresh token window should not move backwards on successive refresh",
    token2RefreshableUntil >= token1RefreshableUntil,
  );
}
