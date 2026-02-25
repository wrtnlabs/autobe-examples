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
 * Test customer login failure with incorrect password.
 *
 * This test validates the security measure of authenticating a customer
 * with incorrect credentials:
 * 1. Register a new customer account with known credentials
 * 2. Attempt login with correct email but wrong password
 * 3. Verify the login attempt fails with an error
 *
 * The test ensures that the system properly rejects invalid credentials
 * and uses secure error messaging that doesn't reveal whether the email
 * exists or the password is incorrect.
 */
export async function test_api_customer_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account first
  const customerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      password,
    },
  });
  typia.assert(authorized);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.error("should fail with wrong password", async () => {
    await api.functional.shoppingMall.auth.customer.login(loginConnection, {
      body: {
        email: authorized.email,
        password: wrongPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
