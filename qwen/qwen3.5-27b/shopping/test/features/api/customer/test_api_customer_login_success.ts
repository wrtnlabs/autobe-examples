import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
 * Validates the complete customer authentication flow including registration and login. Ensures that the login endpoint correctly authenticates customers with valid credentials and returns proper authorization tokens.
 *
 * Special attention is given to verifying that the response contains the correct IAuthorized structure with customer identity, profile information, and JWT tokens with appropriate expiration times.
 *
 * 1. Register a new customer account with unique email and password.
 * 2. Create a new customer connection for login.
 * 3. Login with the registered credentials using authorize_customer_login utility.
 * 4. Validate the response contains customer id, email, banned status, timestamps, profile, and tokens.
 * 5. Verify the access token and refresh token are valid strings.
 * 6. Verify the connection headers are updated with the Authorization token.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredEmail = typia.random<string & tags.Format<"email">>();
  const registeredPassword = RandomGenerator.alphaNumeric(16);
  const registered: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(registerConnection, {
      body: {
        email: registeredEmail,
        password: registeredPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(registered);
  // 2. Create a new customer connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Login with registered credentials
  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_login(loginConnection, {
      body: {
        email: registeredEmail,
        password: registeredPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(loggedIn);
  // 4. Validate response structure
  TestValidator.equals("customer id is UUID", typeof loggedIn.id, "string");
  TestValidator.equals(
    "email matches registered",
    loggedIn.email,
    registeredEmail,
  );
  TestValidator.predicate("customer is not banned", loggedIn.banned === false);
  TestValidator.predicate("deleted_at is null", loggedIn.deleted_at === null);
  TestValidator.predicate(
    "profile display_name exists",
    loggedIn.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loggedIn.token.refreshable_until.length > 0,
  );
  // 5. Verify connection headers are updated with Authorization token
  TestValidator.predicate(
    "connection has Authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
}
