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
 * Test that a banned customer cannot log in to the platform.
 *
 * Workflow:
 * 1. Create and authenticate as an administrator
 * 2. Create a customer account with valid credentials
 * 3. Ban the customer account using the admin ban endpoint
 * 4. Attempt to log in with the banned customer's credentials
 * 5. Verify that the login attempt is rejected
 *
 * This validates the critical security requirement that banned users
 * are prevented from accessing authenticated features.
 */
export async function test_api_customer_login_prevention_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a customer account with valid credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(connection, {
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
  typia.assert(customer);
  // 3. Ban the customer account using admin connection
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer.id,
  });
  // 4. Attempt to log in with the banned customer's credentials
  // 5. Verify that the login attempt is rejected
  await TestValidator.error("banned customer cannot login", async () => {
    const customerConnection: api.IConnection = { host: connection.host };
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
