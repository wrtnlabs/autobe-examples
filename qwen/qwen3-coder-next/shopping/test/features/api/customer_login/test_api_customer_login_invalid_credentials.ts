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

export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer account first to test invalid login scenarios
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Test 1: Login with incorrect password
  await TestValidator.error("invalid password should fail", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(invalidConnection, {
      body: {
        email: customer.token.access, // Using wrong email
        password: "wrongpassword",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Test 2: Login with non-existent email
  await TestValidator.error("non-existent email should fail", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(invalidConnection, {
      body: {
        email: "nonexistent@test.com",
        password: "1234",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Test 3: Login with empty password
  await TestValidator.error("empty password should fail", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(invalidConnection, {
      body: {
        email: customer.token.access,
        password: "",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Test 4: Login with empty email
  await TestValidator.error("empty email should fail", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(invalidConnection, {
      body: {
        email: "",
        password: "1234",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Test 5: Login with invalid email format
  await TestValidator.error("invalid email format should fail", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(invalidConnection, {
      body: {
        email: "notanemail",
        password: "1234",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
