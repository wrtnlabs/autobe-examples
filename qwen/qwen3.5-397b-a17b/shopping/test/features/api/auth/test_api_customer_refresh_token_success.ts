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
 * Test successful token refresh for an authenticated customer.
 *
 * This test validates the refresh token mechanism by:
 * 1. Registering a new customer account to obtain initial authentication tokens
 * 2. Using the refresh token to request new access tokens
 * 3. Verifying the system issues a new token pair with updated expiration times
 *
 * This ensures customers can seamlessly extend their sessions without re-authentication.
 */
export async function test_api_customer_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account to obtain initial tokens
  const joinResult = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract the refresh token from the registration response
  const refreshToken = joinResult.token.refresh;
  // 3. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint using the refresh token
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh: refreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate that the customer ID remains the same
  TestValidator.equals(
    "customer id matches after refresh",
    refreshResult.id,
    joinResult.id,
  );
  // 6. Validate that the email remains the same
  TestValidator.equals(
    "customer email matches after refresh",
    refreshResult.email,
    joinResult.email,
  );
  // 7. Validate that new tokens are different from old tokens (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 8. Validate that new expiration times are valid date-time strings
  TestValidator.predicate(
    "new access token has valid expiration format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResult.token.expired_at),
  );
  TestValidator.predicate(
    "new refresh token has valid expiration deadline format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResult.token.refreshable_until,
    ),
  );
}
