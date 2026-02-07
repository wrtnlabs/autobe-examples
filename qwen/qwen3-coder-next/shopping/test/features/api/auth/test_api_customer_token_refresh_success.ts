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

export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await api.functional.shoppingMall.auth.customer.join(
    joinConnection,
    {
      body: typia.random<IShoppingMallCustomer.IJoin>(),
    },
  );
  typia.assert(joinResponse);
  // 2. Call refresh endpoint with empty refresh request body
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse =
    await api.functional.shoppingMall.auth.customer.refresh(refreshConnection, {
      body: {} satisfies IShoppingMallCustomer.IRefresh,
    });
  typia.assert(refreshResponse);
  // 3. Validate new access token is different from original
  TestValidator.notEquals(
    "new access token differs from original",
    joinResponse.token.access,
    refreshResponse.token.access,
  );
  // 4. Validate token refresh workflow completed successfully
  TestValidator.predicate(
    "refreshed token has valid access token",
    () => refreshResponse.token.access.length > 0,
  );
}
