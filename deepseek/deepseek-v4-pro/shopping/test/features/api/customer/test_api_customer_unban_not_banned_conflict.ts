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
 * Test that unbanning a non-banned customer is rejected with 409 Conflict.
 *
 * Validates the business rule: "IF an administrator attempts to unban a customer
 * account that is not currently banned, THEN the system SHALL reject the request."
 *
 * 1. Administrator registers and authenticates with dedicated connection.
 * 2. Customer registers in good standing — banned_at is null by default.
 * 3. Administrator attempts to unban the non-banned customer.
 * 4. System rejects with HTTP 409 Conflict, confirming the business rule.
 */
export async function test_api_customer_unban_not_banned_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  await TestValidator.httpError(
    "unban non-banned customer returns 409 Conflict",
    409,
    async () =>
      await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
        customerId: customer.id,
      }),
  );
}
