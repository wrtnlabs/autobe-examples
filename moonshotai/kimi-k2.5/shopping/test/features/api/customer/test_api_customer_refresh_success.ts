import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer to obtain initial refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const initialResult = await authorize_customer_join(customerConnection, {
    body: {
      email: `customer${Date.now()}${randint(0, 1000)}@example.com`,
      password: `Password${randint(100, 999)}!`,
      href: "https://example.com/signup",
      referrer: "direct",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(initialResult);
  // Store original token values for comparison
  const originalAccessToken = initialResult.token.access;
  const originalRefreshToken = initialResult.token.refresh;
  const originalExpiredAt = initialResult.token.expired_at;
  const originalRefreshableUntil = initialResult.token.refreshable_until;
  // Step 2: Call refresh endpoint with valid refresh token using utility function
  const refreshResult = await authorize_customer_refresh(customerConnection, {
    body: {
      refresh: initialResult.token.refresh,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Verify token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh (token rotation)",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Verify new expiration timestamps are updated
  TestValidator.predicate(
    "new access token expiration should be later than or equal to original",
    new Date(refreshResult.token.expired_at) >= new Date(originalExpiredAt),
  );
  TestValidator.predicate(
    "new refresh token expiration should be later than or equal to original",
    new Date(refreshResult.token.refreshable_until) >=
      new Date(originalRefreshableUntil),
  );
  // Step 5: Verify customer identity is preserved
  TestValidator.equals(
    "customer id should match after refresh",
    refreshResult.id,
    initialResult.id,
  );
  TestValidator.equals(
    "customer email should match after refresh",
    refreshResult.email,
    initialResult.email,
  );
  TestValidator.equals(
    "customer createdAt should match after refresh",
    refreshResult.createdAt,
    initialResult.createdAt,
  );
}