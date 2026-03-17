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
 * Test that refresh token rotation prevents reuse of the same refresh token.
 *
 * This test validates the token refresh security policy where each refresh token
 * can only be used once. After a successful refresh, the used refresh token is
 * invalidated and a new one is issued.
 *
 * **Test Flow:**
 * 1. Customer registers and receives initial access/refresh token pair
 * 2. First refresh call succeeds, returns new tokens, invalidates old refresh token
 * 3. Attempt to reuse the original refresh token fails with 401 Unauthorized
 * 4. The new refresh token from step 2 works correctly for subsequent refreshes
 */
export async function test_api_customer_token_refresh_reuse_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and gets initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // Store the initial refresh token for reuse attempt
  const initialRefreshToken = initialAuth.token.refresh;
  // 2. First refresh call succeeds with new tokens
  const firstRefreshAuth = await authorize_customer_refresh(
    customerConnection,
    {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  // Store new refresh token for subsequent refresh validation
  const newRefreshToken = firstRefreshAuth.token.refresh;
  // Validate that new tokens are different from initial tokens
  TestValidator.notEquals(
    "new refresh token should differ from initial",
    newRefreshToken,
    initialRefreshToken,
  );
  // 3. Attempt to reuse the original refresh token - should fail with 401
  await TestValidator.httpError(
    "reuse of original refresh token should return 401",
    401,
    async () => {
      await authorize_customer_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: initialRefreshToken,
          } satisfies IShoppingMallCustomer.IRefresh,
        },
      );
    },
  );
  // 4. The new refresh token from first refresh should work for subsequent refreshes
  const secondRefreshAuth = await authorize_customer_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: newRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Validate that yet another new refresh token is issued
  TestValidator.notEquals(
    "second refresh token should differ from first",
    secondRefreshAuth.token.refresh,
    newRefreshToken,
  );
}
