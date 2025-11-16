import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate that a customer with a valid refresh token can obtain new JWT
 * tokens.
 *
 * Business context:
 *
 * - When a customer self-registers through /auth/customer/join, the backend
 *   issues an authorization envelope (IShoppingMallCustomer.IAuthorized)
 *   containing both access and refresh tokens.
 * - The customer later uses the refresh token to renew their authenticated
 *   session via /auth/customer/refresh.
 *
 * This test covers the happy-path refresh flow:
 *
 * 1. Register a new customer using join and capture the initial
 *    IShoppingMallCustomer.IAuthorized payload.
 * 2. Build a refresh request using the issued refresh token plus a realistic
 *    userAgent string.
 * 3. Call POST /auth/customer/refresh and assert that:
 *
 *    - The response type matches IShoppingMallCustomer.IAuthorized.
 *    - Customer identity fields (id, email, name, status, isVerified, createdAt,
 *         updatedAt, and customer summary) remain consistent.
 *    - The access and refresh token strings are rotated (different from the
 *         originals).
 *    - The new token expiration timestamps (expired_at, refreshable_until) are in
 *         the future and not earlier than the original ones.
 */
export async function test_api_customer_refresh_with_valid_token(
  connection: api.IConnection,
) {
  // 1. Register a new customer via join to obtain an initial authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const originalAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(originalAuth);

  const originalToken: IAuthorizationToken = originalAuth.token;
  const originalCustomerSummary: IShoppingMallCustomer.ISummary =
    originalAuth.customer;

  // 2. Build refresh body using the original refresh token
  const refreshBody = {
    refreshToken: originalToken.refresh,
    userAgent: `e2e-test-agent/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IShoppingMallCustomerAuth.IRefresh;

  // 3. Call refresh endpoint
  const refreshedAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(refreshedAuth);

  const refreshedToken: IAuthorizationToken = refreshedAuth.token;
  const refreshedCustomerSummary: IShoppingMallCustomer.ISummary =
    refreshedAuth.customer;

  // 4. Identity consistency assertions
  TestValidator.equals(
    "customer id must be stable across refresh",
    refreshedAuth.id,
    originalAuth.id,
  );
  TestValidator.equals(
    "customer email must be stable across refresh",
    refreshedAuth.email,
    originalAuth.email,
  );
  TestValidator.equals(
    "customer name must be stable across refresh",
    refreshedAuth.name,
    originalAuth.name,
  );
  TestValidator.equals(
    "customer status must be stable across refresh",
    refreshedAuth.status,
    originalAuth.status,
  );

  if (originalAuth.isVerified !== undefined) {
    TestValidator.equals(
      "isVerified flag must be stable when defined",
      refreshedAuth.isVerified,
      originalAuth.isVerified,
    );
  }

  TestValidator.equals(
    "customer summary id must match top-level id after refresh",
    refreshedCustomerSummary.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "customer summary id must be stable across refresh",
    refreshedCustomerSummary.id,
    originalCustomerSummary.id,
  );

  // Display name should not be empty
  TestValidator.predicate(
    "customer summary display_name should be non-empty",
    refreshedCustomerSummary.display_name.length > 0,
  );

  // 5. Token rotation assertions
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshedToken.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated on refresh",
    refreshedToken.refresh,
    originalToken.refresh,
  );

  // 6. Token expiry semantics
  const now: number = Date.now();
  const originalExpiredAtMs: number = new Date(
    originalToken.expired_at,
  ).getTime();
  const originalRefreshableUntilMs: number = new Date(
    originalToken.refreshable_until,
  ).getTime();

  const refreshedExpiredAtMs: number = new Date(
    refreshedToken.expired_at,
  ).getTime();
  const refreshedRefreshableUntilMs: number = new Date(
    refreshedToken.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed access token must expire in the future",
    refreshedExpiredAtMs > now,
  );
  TestValidator.predicate(
    "refreshed refresh token must be usable in the future",
    refreshedRefreshableUntilMs > now,
  );

  TestValidator.predicate(
    "refreshed access token expiration should not be earlier than original",
    refreshedExpiredAtMs >= originalExpiredAtMs,
  );
  TestValidator.predicate(
    "refreshed refreshable_until should not be earlier than original",
    refreshedRefreshableUntilMs >= originalRefreshableUntilMs,
  );
}
