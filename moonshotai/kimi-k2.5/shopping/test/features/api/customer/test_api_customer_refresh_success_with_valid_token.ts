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

/**
 * Test successful customer token refresh using a valid refresh token.
 *
 * 1. Register a new customer to obtain initial access_token and refresh_token
 * 2. Call refresh endpoint with the valid refresh_token from step 1
 * 3. Verify response contains new access token with different value than original
 * 4. Verify response includes customer profile data matching the registered customer
 * 5. Verify response includes token.expired_at timestamp in the future
 * 6. Verify the new tokens have valid expiration timestamps
 */
export async function test_api_customer_refresh_success_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain initial refresh token
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(initialAuth);
  const originalAccessToken = initialAuth.token.access;
  const refreshToken = initialAuth.token.refresh;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_customer_refresh(refreshConnection, {
    body: {
      refreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  // 4. Verify response includes customer profile data matching the registered customer
  TestValidator.equals("customer ID matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "customer email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "customer profile ID matches",
    refreshedAuth.profile.id,
    initialAuth.profile.id,
  );
  // 5. Verify token.expired_at timestamp is in the future
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const now = new Date();
  TestValidator.predicate("token expiration is in the future", expiredAt > now);
  // 6. Verify refreshable_until timestamp is in the future
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
}
