import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_token_refresh_invalid_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain valid tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {});
  typia.assert(joined);
  const validRefreshToken = joined.token.refresh;
  // 2. Attempt refresh with invalid/garbage string token → expect 401
  await TestValidator.httpError(
    "invalid refresh token string",
    401,
    async () =>
      await api.functional.eCommerceMall.auth.customer.refresh(
        customerConnection,
        {
          body: {
            token: "invalid_token_here",
          } satisfies IECommerceMallCustomer.IRefresh,
        },
      ),
  );
  // 3. Attempt refresh with empty string token → expect 401
  await TestValidator.httpError(
    "empty refresh token",
    401,
    async () =>
      await api.functional.eCommerceMall.auth.customer.refresh(
        customerConnection,
        {
          body: {
            token: "",
          } satisfies IECommerceMallCustomer.IRefresh,
        },
      ),
  );
  // 4. Verify that the valid refresh token still works
  const refreshed = await authorize_customer_refresh(customerConnection, {
    body: {
      token: validRefreshToken,
    } satisfies IECommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
}
