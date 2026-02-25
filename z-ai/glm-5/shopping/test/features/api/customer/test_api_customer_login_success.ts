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
 * Test successful customer login with valid credentials.
 *
 * This test validates:
 * 1. Customer can register via join endpoint
 * 2. Customer can login with correct credentials after registration
 * 3. Response contains valid IShoppingMallCustomer.IAuthorized object
 * 4. Access token and refresh token are present in response
 * 5. Customer ID and email in response match the registered account
 * 6. Multiple login sessions can coexist (multi-device support)
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer first
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedCustomer = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(joinedCustomer);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loggedInCustomer);
  // 3. Validate customer information matches
  TestValidator.equals(
    "customer ID matches",
    loggedInCustomer.id,
    joinedCustomer.id,
  );
  TestValidator.equals("email matches", loggedInCustomer.email, email);
  // 4. Validate token structure
  typia.assert<IAuthorizationToken>(loggedInCustomer.token);
  TestValidator.predicate(
    "access token is present",
    loggedInCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    loggedInCustomer.token.refresh.length > 0,
  );
  // 5. Validate tokens are different from join (new session created)
  TestValidator.notEquals(
    "access token is new",
    loggedInCustomer.token.access,
    joinedCustomer.token.access,
  );
  TestValidator.notEquals(
    "refresh token is new",
    loggedInCustomer.token.refresh,
    joinedCustomer.token.refresh,
  );
  // 6. Login again to verify multi-device support (multiple sessions)
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLoginCustomer = await authorize_customer_login(
    secondLoginConnection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(secondLoginCustomer);
  // 7. Validate second login has different tokens (multi-device/session support)
  TestValidator.equals(
    "second login customer ID matches",
    secondLoginCustomer.id,
    joinedCustomer.id,
  );
  TestValidator.notEquals(
    "second login has different access token",
    secondLoginCustomer.token.access,
    loggedInCustomer.token.access,
  );
  TestValidator.notEquals(
    "second login has different refresh token",
    secondLoginCustomer.token.refresh,
    loggedInCustomer.token.refresh,
  );
}
