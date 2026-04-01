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
 * This test verifies the complete customer authentication flow:
 * 1. Register a new customer account with valid email and password
 * 2. Login using the same credentials
 * 3. Verify response contains valid JWT tokens, customer ID, email, and profile
 * 4. Validate token structure and customer information integrity
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate credentials and register a new customer account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const customerJoinResult = await authorize_customer_join(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoinResult);
  // Step 2: Create a new connection for login and authenticate with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Verify customer information matches between join and login
  TestValidator.equals(
    "customer ID matches",
    loginResult.id,
    customerJoinResult.id,
  );
  TestValidator.equals(
    "email matches",
    loginResult.email,
    customerJoinResult.email,
  );
  // Step 4: Validate token expiration timestamps are in future
  TestValidator.predicate(
    "access token expires in future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until in future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  // Step 5: Validate profile information
  TestValidator.equals(
    "profile display name exists",
    loginResult.profile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "profile phone number exists",
    loginResult.profile.phone_number.length > 0,
    true,
  );
  // Step 6: Validate account is active (not soft deleted)
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
}
