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
 * Test that a banned customer's refresh token is rejected with 403 Forbidden.
 *
 * Validates the security mechanism that prevents banned customers from maintaining authenticated sessions through token refresh. When an administrator bans a customer account, the system must look up the associated session, verify the customer account status in shopping_mall_customers, discover that banned_at is not null, forcibly terminate the session by setting expired_at to now, and return 403 Forbidden.
 *
 * This test confirms that the refresh token is no longer usable after the ban denial, verifying the session was properly terminated and the banned customer cannot maintain an authenticated session.
 *
 * 1. A customer registers via join and obtains a refresh token.
 * 2. An administrator registers via join and authenticates.
 * 3. The administrator bans the customer account using the ban endpoint.
 * 4. The customer attempts to refresh their token, which is rejected with 403 Forbidden.
 */
export async function test_api_customer_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Admin bans the customer
  const banned = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId: customer.id },
  );
  typia.assert(banned);
  TestValidator.predicate("customer is banned", banned.banned_at !== null);
  // 4. Customer attempts to refresh using the previously obtained refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned customer refresh denied",
    403,
    async () => {
      await authorize_customer_refresh(refreshConnection, {
        body: {
          refresh: customer.token.refresh,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
