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
 * Test for successful customer login process.
 *
 * Steps:
 * 1. Register a new customer account with valid email and password using authorize_customer_join.
 * 2. Login using authorize_customer_login with the same credentials.
 * 3. Assert the structure and contents of the returned authorization tokens.
 * 4. Confirm that tokens include valid expiration timestamps.
 */
export async function test_api_customer_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create fresh customer join connection
  const joinConnection: api.IConnection = { host: connection.host };
  // Prepare new customer credentials
  const email = RandomGenerator.alphaNumeric(10) + "@example.com";
  const password = "P@ssw0rd!";
  
  // 1. Register customer
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
    } as any,
  });
  typia.assert(joinResult);
  // 2. Use login with same customer
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: IShoppingMallCustomer.ILogin = {
    email,
    password,
  } satisfies IShoppingMallCustomer.ILogin;
  const loginResult = await authorize_customer_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 3. Validate tokens exist and are not empty
  TestValidator.predicate(
    "login token.access is non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  // 4. Validate token expiration timestamps are valid ISO strings
  TestValidator.predicate(
    "token.expired_at is valid date string",
    !Number.isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is valid date string",
    !Number.isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
}
