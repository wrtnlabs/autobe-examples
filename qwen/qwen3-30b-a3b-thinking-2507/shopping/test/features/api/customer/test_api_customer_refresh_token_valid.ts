import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Login to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8),
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // Verify login tokens
  typia.assert(loginResult.token);
  TestValidator.predicate(
    "Access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "Refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // Refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedToken = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  // Verify new tokens
  typia.assert(refreshedToken.token);
  TestValidator.equals(
    "Access tokens differ",
    refreshedToken.token.access,
    loginResult.token.access,
  );
  TestValidator.equals(
    "Refresh tokens differ",
    refreshedToken.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.predicate(
    "New access token exists",
    refreshedToken.token.access.length > 0,
  );
  TestValidator.predicate(
    "New refresh token exists",
    refreshedToken.token.refresh.length > 0,
  );
}
