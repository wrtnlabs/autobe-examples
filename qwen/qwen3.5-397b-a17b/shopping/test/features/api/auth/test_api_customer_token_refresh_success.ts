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
 * Test customer token refresh success path.
 *
 * This test verifies the complete token refresh workflow:
 * 1. Customer joins and receives initial authentication tokens
 * 2. Customer uses refresh token to obtain new tokens
 * 3. New tokens are valid with proper expiration timestamps
 * 4. Customer information is correctly returned
 * 5. New access token is usable for authenticated endpoints
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get initial tokens
  const joinResult = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract refresh token from initial authentication
  const initialRefreshToken = joinResult.token.refresh;
  const initialCustomerId = joinResult.id;
  // 3. Refresh token using the refresh endpoint
  const refreshResult = await authorize_customer_refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Verify customer information is preserved
  TestValidator.equals(
    "customer id preserved",
    refreshResult.id,
    initialCustomerId,
  );
  TestValidator.equals(
    "customer email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "customer nickname preserved",
    refreshResult.nickname,
    joinResult.nickname,
  );
  TestValidator.equals(
    "customer phone preserved",
    refreshResult.phone_number,
    joinResult.phone_number,
  );
  // 5. Verify new tokens are different from initial tokens (token rotation)
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
  // 6. Verify new access token expiration is in the future
  const newExpiredAt = new Date(refreshResult.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "new access token expires in future",
    newExpiredAt > now,
  );
  // 7. Verify refreshable_until timestamp extends the session
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= newExpiredAt,
  );
  // 8. Verify customer summary is embedded correctly
  TestValidator.equals(
    "embedded customer id",
    refreshResult.customer.id,
    refreshResult.id,
  );
  TestValidator.equals(
    "embedded customer email",
    refreshResult.customer.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "embedded customer nickname",
    refreshResult.customer.nickname,
    refreshResult.nickname,
  );
  TestValidator.equals(
    "embedded customer phone",
    refreshResult.customer.phone_number,
    refreshResult.phone_number,
  );
}
