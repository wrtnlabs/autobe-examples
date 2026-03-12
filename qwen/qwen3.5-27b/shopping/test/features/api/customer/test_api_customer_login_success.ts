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
 * 1. Register a new customer account with valid credentials
 * 2. Login with the registered credentials
 * 3. Verify JWT tokens and customer information in response
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const testEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const testPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16);
  const testDisplayName: string = RandomGenerator.name();
  const testPhoneNumber: string = RandomGenerator.mobile();
  // 1. Register a new customer account
  const registerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(registerConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
      phone_number: testPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(registeredCustomer);
  // 2. Login with registered credentials (reuse same password)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: testEmail,
    password: testPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.ILogin;
  const loggedInCustomer = await authorize_customer_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInCustomer);
  // 3. Verify JWT tokens exist and are non-empty
  TestValidator.predicate(
    "access token exists",
    loggedInCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loggedInCustomer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loggedInCustomer.token.refreshable_until.length > 0,
  );
  // 4. Verify customer information
  TestValidator.equals(
    "customer id matches",
    loggedInCustomer.id,
    registeredCustomer.id,
  );
  TestValidator.equals(
    "email matches input",
    loggedInCustomer.email,
    testEmail,
  );
  TestValidator.equals(
    "display_name matches",
    loggedInCustomer.display_name,
    testDisplayName,
  );
  TestValidator.equals(
    "phone_number matches",
    loggedInCustomer.phone_number,
    testPhoneNumber,
  );
  TestValidator.equals("status is active", loggedInCustomer.status, "active");
  TestValidator.predicate(
    "created_at exists",
    loggedInCustomer.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    loggedInCustomer.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", loggedInCustomer.deleted_at, null);
}
