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

export async function test_api_customer_refresh_token_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to establish authentication session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Attempt to refresh using an invalid refresh token
  // This simulates an expired session scenario where the refresh token is no longer valid
  // (either expired_at timestamp has passed or token was invalidated)
  const invalidRefreshToken = typia.random<string>();
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Verify the system rejects the refresh request for invalid/expired token
  // This validates session expiration enforcement and security boundary
  await TestValidator.error("expired session refresh rejected", async () => {
    await authorize_customer_refresh(refreshConnection, {
      body: {
        refresh: invalidRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });
  // 4. Verify the valid customer token from registration still works
  // This confirms the error was due to invalid token, not system issue
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(validRefreshConnection, {
    body: {
      refresh: customer.token.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // 5. Validate refresh returned new tokens (typia.assert validates all types)
  TestValidator.notEquals(
    "token rotated",
    customer.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    customer.token.refresh,
    refreshed.token.refresh,
  );
}
