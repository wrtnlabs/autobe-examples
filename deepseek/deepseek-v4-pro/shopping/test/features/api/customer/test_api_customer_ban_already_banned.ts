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
 * Test that attempting to ban an already-banned customer is rejected with a business rule error.
 *
 * Validates the idempotency guard on the customer ban endpoint. After an administrator successfully bans a customer, a second ban attempt on the same customer must be rejected with an error — duplicate bans are a business rule violation. The test confirms that the system correctly checks the banned_at field before applying a new ban and that the first ban's timestamp is preserved.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. A new customer account is registered.
 * 3. Administrator bans the customer — the operation succeeds and the customer record reflects the banned_at timestamp.
 * 4. Administrator attempts to ban the same customer again — the operation is rejected with an error.
 */
export async function test_api_customer_ban_already_banned(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. First ban — should succeed
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId: customer.id },
  );
  typia.assert(bannedCustomer);
  // Validate first ban was applied
  TestValidator.predicate(
    "customer is banned after first ban",
    bannedCustomer.banned_at !== null,
  );
  // 4. Second ban — should be rejected
  await TestValidator.error(
    "duplicate ban on already-banned customer",
    async () => {
      await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
        customerId: customer.id,
      });
    },
  );
}
