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
 * Test that login is rejected for a banned customer account.
 * 1. Register admin account and login
 * 2. Register a new customer account
 * 3. Admin bans the customer account
 * 4. Attempt to login with banned account
 * 5. Verify login is rejected with error and no session created
 */
export async function test_api_customer_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Store credentials for later login attempt
  const customerEmail = customer.email;
  const customerPassword = "1234";
  // 3. Admin bans the customer account
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer.id,
      body: {
        reason: "Test ban for E2E testing",
      } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  // Verify customer status is now 'banned'
  TestValidator.equals(
    "customer status is banned",
    bannedCustomer.status,
    "banned",
  );
  // 4. Attempt to login with banned account
  const loginConnection: api.IConnection = { host: connection.host };
  // 5. Verify login is rejected with error
  await TestValidator.error("login rejected for banned account", async () => {
    await authorize_customer_login(loginConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Verify no session is created (loginConnection should not have Authorization header)
  TestValidator.predicate(
    "no session created",
    !loginConnection.headers?.Authorization,
  );
}
