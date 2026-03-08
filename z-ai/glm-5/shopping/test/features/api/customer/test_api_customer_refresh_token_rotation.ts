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

export async function test_api_customer_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new customer account and get initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // Step 2: Store the initial refresh token
  const initialRefreshToken = authResult.token.refresh;
  // Step 3: First refresh - should succeed
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh: initialRefreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(firstRefresh);
  // Step 4: Verify tokens are rotated (new refresh token differs from old)
  TestValidator.notEquals(
    "refresh token should be rotated",
    firstRefresh.token.refresh,
    initialRefreshToken,
  );
  // Step 5: Attempt to reuse the original refresh token - should fail with 401
  await TestValidator.httpError(
    "reuse of original refresh token should fail",
    401,
    async () => {
      const reuseConnection: api.IConnection = { host: connection.host };
      await authorize_customer_refresh(reuseConnection, {
        body: {
          refresh: initialRefreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
