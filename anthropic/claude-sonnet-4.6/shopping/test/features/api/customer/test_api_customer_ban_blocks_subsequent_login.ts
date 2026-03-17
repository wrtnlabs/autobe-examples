import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_ban_blocks_subsequent_login(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a new customer and capture credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // 3. Super admin bans the customer
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      {
        customerId,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Verify the ban status is true
  TestValidator.equals(
    "customer is banned after ban operation",
    bannedCustomer.isBanned,
    true,
  );
  // 5. Attempt to log in as the banned customer — must be rejected
  await TestValidator.error(
    "banned customer login must be denied",
    async () => {
      const loginConnection: api.IConnection = { host: connection.host };
      await authorize_customer_login(loginConnection, {
        body: {
          email: customerEmail,
          password: customerPassword,
        } satisfies IShoppingMallCustomer.ILogin,
      });
    },
  );
}
