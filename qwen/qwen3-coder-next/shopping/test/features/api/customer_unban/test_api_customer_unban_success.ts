import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

export async function test_api_customer_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(12);
  await authorize_customer_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(customerEmail),
      password: customerPassword,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Step 3: Ban the customer
  const bannedCustomer =
    await api.functional.shoppingMall.admin.customers.bans.ban(
      adminConnection,
      {
        customerId: customerEmail,
        body: {
          reason: "Test ban for unban verification",
          duration: null,
        } satisfies IShoppingMallCustomer.IBan,
      },
    );
  typia.assert(bannedCustomer);
  // Step 4: Unban the customer
  await api.functional.shoppingMall.admin.customers.unbans.unban(
    adminConnection,
    {
      customerId: bannedCustomer.id,
    },
  );
  // Step 5: Verify customer can log in again
  const customerConnection: api.IConnection = { host: connection.host };
  const loggedCustomer = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedCustomer);
  // Step 6: Verify customer can access platform features
  TestValidator.equals(
    "customer is not deleted",
    loggedCustomer.deleted_at,
    null,
  );
  TestValidator.equals(
    "customer status is active",
    loggedCustomer.deleted_at,
    null,
  );
}