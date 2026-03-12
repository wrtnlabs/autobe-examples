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
 * Test the primary success path for customer unban operation.
 *
 * This test validates that an administrator can successfully restore access
 * to a previously banned customer account. The workflow includes:
 * 1. Creating a customer account
 * 2. Creating an admin account
 * 3. Banning the customer
 * 4. Unbanning the customer
 * 5. Verifying status change and login capability
 */
export async function test_api_customer_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;
  // 2. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminJoin);
  // 3. Ban the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId,
      body: {
        reason: "Test ban for unban verification",
      } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals(
    "customer status is banned",
    bannedCustomer.status,
    "banned",
  );
  const bannedUpdatedAt = bannedCustomer.updated_at;
  // 4. Unban the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
      customerId,
    });
  typia.assert(unbannedCustomer);
  // 5. Verify status changed to active
  TestValidator.equals(
    "customer status is active after unban",
    unbannedCustomer.status,
    "active",
  );
  // 6. Verify updated_at timestamp was updated
  TestValidator.notEquals(
    "updated_at changed after unban",
    bannedUpdatedAt,
    unbannedCustomer.updated_at,
  );
  // 7. Verify customer can log in successfully (ban is lifted)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerJoin.email,
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogin);
  TestValidator.equals(
    "customer can login after unban",
    customerLogin.status,
    "active",
  );
}
