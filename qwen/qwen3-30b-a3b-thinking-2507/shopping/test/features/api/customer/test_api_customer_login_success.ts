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

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for customer account creation
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate random email and password
  const email =
    RandomGenerator.name() + RandomGenerator.alphaNumeric(8) + "@example.com";
  const password = RandomGenerator.alphaNumeric(10);
  // Create customer account with email and password
  const createdCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(createdCustomer);
  // Verify email is not verified at initial registration
  TestValidator.equals(
    "email should be unverified initially",
    createdCustomer.email_verified,
    false,
  );
  // Create new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // Log in with the same credentials
  const loggedUser = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedUser);
  // Verify JWT tokens are valid
  TestValidator.equals(
    "access token should not be empty",
    loggedUser.token.access !== "",
    true,
  );
  TestValidator.equals(
    "refresh token should not be empty",
    loggedUser.token.refresh !== "",
    true,
  );
}
