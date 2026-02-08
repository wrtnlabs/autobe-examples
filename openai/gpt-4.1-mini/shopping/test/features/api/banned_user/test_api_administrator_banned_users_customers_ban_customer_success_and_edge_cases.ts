import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_customers_ban_customer_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Ban an existing customer successfully
  const existingCustomerId = typia.random<string & tags.Format<"uuid">>();
  const banReason1 = "Violation of platform policies";
  const banRequest1: IShoppingMallBannedUser.IBanCustomerRequest = {
    ban_reason: banReason1,
  };
  const bannedUser =
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      {
        customerId: existingCustomerId,
        body: banRequest1,
      },
    );
  typia.assert(bannedUser);
  // 3. Attempt to ban already banned customer
  await TestValidator.error("duplicate ban attempt", async () => {
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      {
        customerId: existingCustomerId,
        body: banRequest1,
      },
    );
  });
  // 4. Attempt to ban non-existing customer
  const nonExistingCustomerId = typia.random<string & tags.Format<"uuid">>();
  const banRequest2: IShoppingMallBannedUser.IBanCustomerRequest = {
    ban_reason: "Banned for testing non-existing customer",
  };
  await TestValidator.error("ban non-existing customer", async () => {
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      {
        customerId: nonExistingCustomerId,
        body: banRequest2,
      },
    );
  });
}
