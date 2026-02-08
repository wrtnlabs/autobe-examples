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

export async function test_api_customer_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(12)}@example.com`;
  const password = "correct_password_123";
  await authorize_customer_join(customerConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Attempt to login with the correct email but incorrect password
  const loginConnection: api.IConnection = { host: connection.host };
  const incorrectPassword = "wrong_password_456";
  await TestValidator.error(
    "customer login with incorrect password",
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
