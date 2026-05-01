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
 * Test that a banned customer account is rejected at login with 403 Forbidden.
 *
 * Validates the business rule that banned customers cannot authenticate regardless
 * of providing correct credentials. A customer is first registered and then banned
 * by an administrator. The customer's subsequent login attempt with valid email and
 * password is rejected with a 403 status, confirming the ban takes effect immediately
 * and blocks all authentication.
 *
 * 1. Customer registers with explicit email and password.
 * 2. Administrator registers and authenticates.
 * 3. Administrator bans the customer account.
 * 4. Customer attempts login with correct credentials — rejected with 403.
 */
export async function test_api_customer_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer with explicit credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Admin bans the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId: customer.id },
  );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "banned_at is set after ban",
    bannedCustomer.banned_at !== null,
  );
  // 4. Banned customer attempts login — must be rejected with 403
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "banned customer login rejected with 403",
    403,
    async () => {
      await authorize_customer_login(loginConnection, {
        body: {
          email: customerEmail,
          password: customerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
