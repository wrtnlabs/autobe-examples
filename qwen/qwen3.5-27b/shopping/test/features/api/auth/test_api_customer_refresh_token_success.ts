import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the primary success path for customer token refresh operation.
 *
 * Validates that a customer can successfully refresh their authentication tokens without re-entering credentials. The test registers a new customer, extracts the refresh token, and uses it to obtain new access and refresh tokens.
 *
 * The refresh operation should return new tokens while preserving the customer's identity and account status. Token rotation ensures that the previous refresh token is invalidated, enhancing security.
 *
 * 1. Register a new customer account and obtain initial refresh token.
 * 2. Extract the refresh token from the join response.
 * 3. Call the refresh endpoint with the valid refresh token and session context.
 * 4. Validate that new tokens are returned with updated expiration timestamps.
 * 5. Verify that the new refresh token is different from the original (token rotation).
 */
export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {});
  typia.assert(joined);
  // Store original refresh token for comparison
  const originalRefreshToken = joined.token.refresh;
  // 2. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Prepare refresh request body
  const refreshBody = {
    refreshToken: originalRefreshToken,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IRefresh;
  // 4. Call refresh endpoint
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // 5. Validate customer identity is preserved
  TestValidator.equals("customer id preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "customer email preserved",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals("customer banned status", refreshed.banned, false);
  TestValidator.equals(
    "customer profile exists",
    refreshed.profile.display_name,
    joined.profile.display_name,
  );
  // 6. Validate new tokens are provided
  TestValidator.predicate(
    "new access token exists",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshed.token.refresh.length > 0,
  );
  // 7. Validate token rotation (new refresh token is different from original)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 8. Validate timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "access token expired_at is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 9. Validate refreshable_until is after expired_at (session can be extended)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
