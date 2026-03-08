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
 * Test rate limiting on customer token refresh endpoint.
 *
 * Validates that the system enforces a maximum of 10 refresh requests
 * per minute per customer, blocking requests that exceed the limit
 * with HTTP 429 Too Many Requests error.
 */
export async function test_api_customer_refresh_rate_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // Store the refresh token for rate limit testing
  const refreshToken = authResult.token.refresh;
  // Step 2: Make 10 successful refresh requests (within rate limit)
  const refreshConnection: api.IConnection = { host: connection.host };
  for (let i = 0; i < 10; i++) {
    const refreshResult = await authorize_customer_refresh(refreshConnection, {
      body: { refresh: refreshToken } satisfies IShoppingMallCustomer.IRefresh,
    });
    typia.assert(refreshResult);
  }
  // Step 3: Make 11th request which should fail with 429 error
  await TestValidator.httpError(
    "11th refresh request should be rate limited",
    429,
    async () => {
      await authorize_customer_refresh(refreshConnection, {
        body: {
          refresh: refreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
