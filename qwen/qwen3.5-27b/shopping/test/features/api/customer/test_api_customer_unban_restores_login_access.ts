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
 * Test that unbanning a customer restores their login access.
 *
 * This test validates the critical business requirement that when a customer
 * account is unbanned by an administrator, the customer regains the ability
 * to log in to the platform. The test follows the complete workflow:
 * register customer → verify login works → ban customer → verify login fails
 * → unban customer → verify login restored.
 */
export async function test_api_customer_unban_restores_login_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer Registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerEmail = customerJoin.email;
  const customerPassword = "1234";
  const customerId = customerJoin.id;
  // 2. Baseline Login Verification (before ban)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginBeforeBan = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginBeforeBan);
  TestValidator.equals(
    "customer can login before ban",
    customerLoginBeforeBan.status,
    "active",
  );
  // 3. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 4. Ban Customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customerId,
      body: {
        reason: "Test ban for unban workflow validation",
      } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer status is banned",
    bannedCustomer.status,
    "banned",
  );
  // 5. Verify Login Blocked (expect error)
  await TestValidator.error("customer cannot login while banned", async () => {
    const blockedLoginConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(blockedLoginConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // 6. Unban Customer
  const unbannedCustomer =
    await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
      customerId: customerId,
    });
  typia.assert(unbannedCustomer);
  TestValidator.equals(
    "customer status is active after unban",
    unbannedCustomer.status,
    "active",
  );
  // 7. Verify Login Restored
  const restoredLoginConnection: api.IConnection = { host: connection.host };
  const customerLoginAfterUnban = await authorize_customer_login(
    restoredLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoginAfterUnban);
  TestValidator.equals(
    "customer can login after unban",
    customerLoginAfterUnban.status,
    "active",
  );
}
