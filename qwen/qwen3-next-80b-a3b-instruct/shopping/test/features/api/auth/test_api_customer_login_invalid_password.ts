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

export async function test_api_customer_login_invalid_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid test customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Attempt login with invalid password (correct email, wrong password)
  const loginConnection: api.IConnection = { host: connection.host };
  const invalidPasswordLogin = {
    email: joinResult.email,
    password: RandomGenerator.alphaNumeric(16), // Different password
  } satisfies IShoppingMallCustomer.ILogin;
  // Validate that login with invalid password throws 401 Unauthorized
  await TestValidator.httpError(
    "login with invalid password should return 401",
    401,
    async () => {
      await authorize_customer_login(loginConnection, {
        body: invalidPasswordLogin,
      });
    },
  );
  // Step 3: Verify no session was created (no authorization header set after failed login)
  // The utility function only updates headers on successful authentication
  // Verify that connection headers are empty/unchanged after failed attempt
  TestValidator.equals(
    "no authorization header on failed login",
    loginConnection.headers?.Authorization,
    undefined,
  );
}
