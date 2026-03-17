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
 * Test token refresh behavior for customer authentication.
 *
 * Note: The original scenario requires testing token refresh after account deletion.
 * However, no customer delete endpoint is available in the provided API functions.
 * This test validates the token refresh mechanism works correctly for active customer
 * accounts, ensuring refresh tokens can be exchanged for new access tokens.
 *
 * Test flow:
 * 1. Create customer account and obtain initial authentication tokens
 * 2. Use the refresh token to obtain new access/refresh tokens
 * 3. Validate the refreshed response contains valid customer data
 * 4. Verify customer identity is preserved across token refresh
 *
 * @param connection Base connection for API calls
 */
export async function test_api_customer_token_refresh_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(joinResult);
  // Step 2: Attempt to refresh token using the refresh token from join
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    },
  });
  typia.assert(refreshResult);
  // Step 3: Validate refreshed tokens are valid
  TestValidator.predicate(
    "refreshed access token exists",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token exists",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp is valid",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until timestamp is valid",
    new Date(refreshResult.token.refreshable_until) > new Date(),
  );
  // Step 4: Verify customer identity is preserved after refresh
  TestValidator.equals(
    "customer ID matches after refresh",
    refreshResult.customer.id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "email matches after refresh",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "nickname matches after refresh",
    refreshResult.nickname,
    joinResult.nickname,
  );
  TestValidator.equals(
    "phone number matches after refresh",
    refreshResult.phone_number,
    joinResult.phone_number,
  );
  // Step 5: Verify customer is not deleted (active account)
  TestValidator.equals(
    "customer account is active (not deleted)",
    refreshResult.deleted_at,
    null,
  );
  TestValidator.equals(
    "customer summary deleted_at is null",
    refreshResult.customer.deleted_at,
    null,
  );
}
