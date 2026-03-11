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
 * Test successful token refresh for a customer with valid refresh token.
 *
 * This test validates:
 * 1. Customer can refresh tokens with a valid refresh token
 * 2. Customer profile information is preserved after refresh
 * 3. New access token is generated (different from original)
 * 4. New refresh token is generated (different from original) - token rotation
 * 5. Original refresh token cannot be reused after rotation
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer to obtain valid refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(registeredCustomer);
  // Store the original refresh token for refresh operation
  const originalRefreshToken = registeredCustomer.token.refresh;
  const originalAccessToken = registeredCustomer.token.access;
  // Step 2: Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedCustomer = await authorize_customer_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshedCustomer);
  // Step 3: Validate customer profile is preserved
  TestValidator.equals(
    "customer id preserved",
    refreshedCustomer.id,
    registeredCustomer.id,
  );
  TestValidator.equals(
    "email preserved",
    refreshedCustomer.email,
    registeredCustomer.email,
  );
  TestValidator.equals(
    "displayName preserved",
    refreshedCustomer.displayName,
    registeredCustomer.displayName,
  );
  TestValidator.equals(
    "phoneNumber preserved",
    refreshedCustomer.phoneNumber,
    registeredCustomer.phoneNumber,
  );
  TestValidator.equals(
    "banned status preserved",
    refreshedCustomer.banned,
    false,
  );
  // Step 4: Validate new access token is generated (different from original)
  TestValidator.notEquals(
    "access token rotated",
    refreshedCustomer.token.access,
    originalAccessToken,
  );
  // Step 5: Validate new refresh token is generated (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedCustomer.token.refresh,
    originalRefreshToken,
  );
  // Step 6: Validate token expiration timestamps exist and are valid
  TestValidator.predicate(
    "expired_at is future",
    new Date(refreshedCustomer.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    new Date(refreshedCustomer.token.refreshable_until) > new Date(),
  );
  // Step 7: Validate original refresh token cannot be reused
  await TestValidator.error(
    "original refresh token reuse should fail",
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await api.functional.shoppingMall.auth.customer.refresh(reuseConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
