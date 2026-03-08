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
 * Test customer login with invalid credentials (wrong password).
 * Verifies that the system returns HTTP 401 Unauthorized when
 * authentication fails, preventing account enumeration attacks
 * by not revealing whether email exists or password was wrong.
 */
export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account with known credentials
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      password: correctPassword,
    },
  });
  typia.assert(registeredCustomer);
  // Step 2: Attempt login with correct email but wrong password
  const wrongPassword = "WrongPassword" + RandomGenerator.alphaNumeric(8);
  const testConnection: api.IConnection = { host: connection.host };
  // Step 3: Verify HTTP 401 error is returned for invalid credentials
  // This validates security: no token leakage, generic error, prevents enumeration
  await TestValidator.httpError(
    "should return 401 for invalid credentials (wrong password)",
    401,
    async () => {
      await api.functional.shoppingMall.auth.customer.login(testConnection, {
        body: {
          email: registeredCustomer.email,
          password: wrongPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
  // Step 4: Verify consistent behavior for non-existent email
  // Same 401 status prevents account enumeration
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.httpError(
    "should return 401 for non-existent email (same as wrong password)",
    401,
    async () => {
      await api.functional.shoppingMall.auth.customer.login(testConnection, {
        body: {
          email: nonExistentEmail,
          password: wrongPassword,
          href: "https://example.com/login",
          referrer: "https://example.com",
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
