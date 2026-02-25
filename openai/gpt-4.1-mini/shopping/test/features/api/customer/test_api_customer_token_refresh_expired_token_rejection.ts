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

export async function test_api_customer_token_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer to get a valid refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Prepare expired refresh token string (simulate by using an obviously invalid token)
  const expiredRefreshToken = "expired-refresh-token-simulated";
  // 3. Call refresh API with the expired token and expect an error
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("refresh token rejected when expired", async () => {
    await authorize_customer_refresh(refreshConnection, {
      body: {
        refreshToken: expiredRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });
}
