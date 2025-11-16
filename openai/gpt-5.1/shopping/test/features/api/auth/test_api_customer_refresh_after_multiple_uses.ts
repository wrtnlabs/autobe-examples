import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate customer refresh token behavior for multiple consecutive uses.
 *
 * Business intent:
 *
 * - Ensure that a customer can refresh their authentication tokens multiple times
 *   and that the platform returns consistent identity information while
 *   evolving token state.
 * - Specifically, this test exercises reusing the same refresh token multiple
 *   times as well as using the most recently issued refresh token, to observe
 *   rotation semantics without assuming a strict single-use policy.
 *
 * Steps:
 *
 * 1. Register a new customer using /auth/customer/join and capture the initial
 *    IShoppingMallCustomer.IAuthorized payload (authorized0).
 * 2. First refresh: call /auth/customer/refresh with authorized0.token.refresh and
 *    a realistic userAgent string, capturing authorized1.
 * 3. Second refresh: call /auth/customer/refresh again with the ORIGINAL
 *    authorized0.token.refresh, capturing authorized2.
 * 4. Third refresh: call /auth/customer/refresh with the latest known refresh
 *    token (authorized2.token.refresh), capturing authorized3.
 * 5. Across all responses, assert:
 *
 *    - Type correctness via typia.assert.
 *    - Identity invariants: id, email, name, customer.id remain stable.
 *    - Token invariants: access/refresh strings are non-empty and at least one
 *         access token differs from the original after refresh operations.
 *
 * Error handling:
 *
 * - This test assumes refresh calls succeed; it does not enforce a particular
 *   rejection policy for reused refresh tokens and does not assert on HTTP
 *   status codes.
 */
export async function test_api_customer_refresh_after_multiple_uses(
  connection: api.IConnection,
) {
  // 1. Register a new customer to obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized0 = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized0);

  const token0: IAuthorizationToken = authorized0.token;

  // Sanity check: initial token fields
  TestValidator.predicate(
    "initial access token must be non-empty",
    token0.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token must be non-empty",
    token0.refresh.length > 0,
  );

  // Helper to assert identity invariants between two authorization envelopes
  const assertIdentityStable = (
    title: string,
    base: IShoppingMallCustomer.IAuthorized,
    got: IShoppingMallCustomer.IAuthorized,
  ): void => {
    TestValidator.equals(`${title} - customer id stable`, got.id, base.id);
    TestValidator.equals(
      `${title} - customer email stable`,
      got.email,
      base.email,
    );
    TestValidator.equals(
      `${title} - customer name stable`,
      got.name,
      base.name,
    );
    TestValidator.equals(
      `${title} - summary id stable`,
      got.customer.id,
      base.customer.id,
    );
  };

  // 2. First refresh with the original refresh token
  const refreshBody1 = {
    refreshToken: token0.refresh,
    userAgent: "Mozilla/5.0 (E2E Test Suite)", // realistic enough UA
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  const authorized1 = await api.functional.auth.customer.refresh(connection, {
    body: refreshBody1,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized1);

  assertIdentityStable("first refresh", authorized0, authorized1);

  const token1: IAuthorizationToken = authorized1.token;

  TestValidator.predicate(
    "first refresh access token non-empty",
    token1.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh refresh token non-empty",
    token1.refresh.length > 0,
  );

  // 3. Second refresh, reusing the ORIGINAL refresh token
  const refreshBody2 = {
    refreshToken: token0.refresh,
    userAgent: "Mozilla/5.0 (E2E Test Suite second use)",
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  const authorized2 = await api.functional.auth.customer.refresh(connection, {
    body: refreshBody2,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized2);

  assertIdentityStable(
    "second refresh (original token)",
    authorized0,
    authorized2,
  );

  const token2: IAuthorizationToken = authorized2.token;

  TestValidator.predicate(
    "second refresh access token non-empty",
    token2.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh refresh token non-empty",
    token2.refresh.length > 0,
  );

  // 4. Third refresh, using the latest known refresh token from authorized2
  const refreshBody3 = {
    refreshToken: token2.refresh,
    userAgent: "Mozilla/5.0 (E2E Test Suite third use)",
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  const authorized3 = await api.functional.auth.customer.refresh(connection, {
    body: refreshBody3,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorized3);

  assertIdentityStable(
    "third refresh (latest token)",
    authorized0,
    authorized3,
  );

  const token3: IAuthorizationToken = authorized3.token;

  TestValidator.predicate(
    "third refresh access token non-empty",
    token3.access.length > 0,
  );
  TestValidator.predicate(
    "third refresh refresh token non-empty",
    token3.refresh.length > 0,
  );

  // 5. Ensure that at least one access token differs from the original,
  // indicating that refresh has some effect on access token state.
  const anyAccessChanged: boolean =
    token1.access !== token0.access ||
    token2.access !== token0.access ||
    token3.access !== token0.access;

  TestValidator.predicate(
    "at least one refreshed access token should differ from the original",
    anyAccessChanged,
  );
}
