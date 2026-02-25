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
 * Test successful token refresh for an authenticated customer.
 *
 * Validates the complete token rotation workflow:
 * 1. Customer joins and receives initial access_token and refresh_token
 * 2. Customer calls refresh endpoint with valid refresh_token
 * 3. System generates NEW access_token and NEW refresh_token
 * 4. Response returns IShoppingMallCustomer.IAuthorized with new tokens
 * 5. OLD tokens become invalid (token rotation security pattern)
 * 6. Session continuity is maintained - customer profile preserved
 */
export async function test_api_customer_refresh_token_rotation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. Refresh tokens using the refresh_token
  const refreshedAuth = await authorize_customer_refresh(customerConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshedAuth);
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  // 3. Validate token rotation - new tokens should be different from old tokens
  TestValidator.notEquals(
    "access token rotated",
    newAccessToken,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    newRefreshToken,
    initialRefreshToken,
  );
  // 4. Validate customer profile consistency (session continuity)
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
  // 5. Validate old refresh_token cannot be reused (security)
  const testConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await authorize_customer_refresh(testConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });
}
