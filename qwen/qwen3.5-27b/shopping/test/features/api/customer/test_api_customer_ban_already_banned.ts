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
 * Test that attempting to ban an already banned customer returns an error.
 *
 * This test verifies that the system prevents redundant ban operations by:
 * 1. Registering an admin and customer
 * 2. Banning the customer once
 * 3. Attempting to ban the same customer again
 * 4. Verifying the second ban attempt fails with an appropriate error
 */
export async function test_api_customer_ban_already_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup - register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. First ban - ban the customer (should succeed)
  const firstBanReason = "Violation of terms of service";
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer.id,
      body: { reason: firstBanReason } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer);
  // Verify customer is now banned
  TestValidator.equals(
    "customer status is banned",
    bannedCustomer.status,
    "banned",
  );
  // 4. Second ban attempt - try to ban the already banned customer (should fail)
  const secondBanReason = "Additional violation";
  await TestValidator.error("ban already banned customer fails", async () => {
    await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
      customerId: customer.id,
      body: { reason: secondBanReason } satisfies IShoppingMallCustomer.IBan,
    });
  });
}
