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
 * Test that an administrator can successfully unban a previously banned customer.
 *
 * Validates the complete unban workflow including administrative authentication, customer creation and banning, the unban operation itself, and post-unban verification that the customer regains full platform access.
 *
 * Special attention is given to verifying that the banned_at field is cleared to null, the updated_at timestamp is refreshed to indicate the modification, and the customer can authenticate normally after the unban.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Customer registers with unique credentials.
 * 3. Administrator bans the customer account.
 * 4. Administrator unbans the customer account.
 * 5. Validates banned_at is null and updated_at is refreshed.
 * 6. Customer logs in successfully after unban.
 */
export async function test_api_customer_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration & authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration with deterministic credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // 3. Admin bans the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId: customer.id },
  );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "customer banned_at is set after ban",
    bannedCustomer.banned_at !== null,
  );
  // 4. Admin unbans the customer
  const unbannedCustomer =
    await api.functional.shoppingMall.admin.customers.unban(adminConnection, {
      customerId: customer.id,
    });
  typia.assert(unbannedCustomer);
  // 5. Validate unban response
  TestValidator.equals(
    "banned_at is null after unban",
    unbannedCustomer.banned_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is refreshed after unban",
    unbannedCustomer.updated_at !== customer.updated_at,
  );
  // 6. Customer can log in after unban
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(loggedInCustomer);
  TestValidator.equals(
    "customer id matches after login",
    loggedInCustomer.id,
    customer.id,
  );
  TestValidator.equals(
    "banned_at is null after post-unban login",
    loggedInCustomer.banned_at,
    null,
  );
}
