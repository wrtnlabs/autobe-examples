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

export async function test_api_customer_unban_with_session_restore(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = typia.random<IShoppingMallAdmin.IJoin>();
  await authorize_admin_join(adminConnection, {
    body: adminUser,
  });
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerUser = typia.random<IShoppingMallCustomer.IJoin>();
  const customer = await authorize_customer_join(customerConnection, {
    body: customerUser,
  });
  typia.assert(customer);
  // 3. Customer logs in to create active sessions
  const loginBody = {
    email: customerUser.email,
    password: customerUser.password,
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ILogin;
  const loginResult = await authorize_customer_login(customerConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // 4. Admin bans the customer
  await api.functional.shoppingMall.admin.customers.bans.ban(adminConnection, {
    customerId: customer.id,
    body: {
      reason: "Testing unban flow",
      duration: null,
    } satisfies IShoppingMallCustomer.IBan,
  });
  // 5. Admin unban the customer
  await api.functional.shoppingMall.admin.customers.unbans.unban(
    adminConnection,
    {
      customerId: customer.id,
    },
  );
  // 6. Verify customer can log in again
  const reloginResult = await authorize_customer_login(customerConnection, {
    body: loginBody,
  });
  typia.assert(reloginResult);
  TestValidator.equals("customer ID matches", reloginResult.id, customer.id);
}
