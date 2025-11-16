import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

export async function test_api_customer_login_respects_disabled_or_blocked_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new customer via /auth/customer/join
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd!";

  const joinBody = {
    email,
    password,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const joined = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(joined);

  // Basic sanity checks on joined authorization envelope
  TestValidator.predicate(
    "joined customer id should be non-empty",
    joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined status should be non-empty string",
    joined.status.length > 0,
  );

  // 2. Successful login with correct credentials
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    userAgent: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const loggedIn = await api.functional.auth.customer.login(connection, {
    body: loginBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(loggedIn);

  TestValidator.equals(
    "login should return same customer id as join",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "login should return same customer email as join",
    loggedIn.email,
    joined.email,
  );

  // 3. Simulate blocked/invalid credentials by using an unknown email
  const unknownEmail = typia.random<string & tags.Format<"email">>();
  const failingLoginBody = {
    email: unknownEmail,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    userAgent: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerAuth.ILogin;

  await TestValidator.error(
    "login with unknown email should fail",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: failingLoginBody,
      });
    },
  );
}
