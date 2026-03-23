import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful token refresh for an authenticated customer session.
 *
 * This test validates the core token refresh workflow that enables seamless
 * authenticated sessions without requiring users to re-enter credentials when
 * their access token expires. It verifies token rotation and response structure.
 */
export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new customer and obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: undefined,
    });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // 2. Test Execution: Refresh the token using a new connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Validation: Verify token rotation and response structure
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  TestValidator.equals(
    "customer id preserved",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "customer email preserved",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "customer display name preserved",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "customer status is active",
    refreshedAuth.status,
    "active",
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(refreshedAuth.token.expired_at),
  );
}
