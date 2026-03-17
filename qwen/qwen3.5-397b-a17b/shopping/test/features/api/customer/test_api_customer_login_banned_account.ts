import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test login attempt with a banned customer account.
 *
 * This test validates that banned customer accounts cannot authenticate to the platform.
 * The test flow:
 * 1. Register a new customer account with valid credentials
 * 2. Register and login as an administrator
 * 3. Use admin privileges to ban the customer account
 * 4. Attempt to login with the banned customer's credentials
 * 5. Verify that authentication fails because the account is banned
 *
 * The system should reject the login request and not generate JWT tokens.
 * This validates that banned accounts cannot access platform features per business rules 506 and 510.
 */
export async function test_api_customer_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Register and login as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 3. Ban the customer account using admin privileges
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customerJoin.id,
  });
  // 4-5. Attempt to login with the banned customer's credentials and verify it fails
  const customerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned account login should fail", async () => {
    await authorize_customer_login(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
