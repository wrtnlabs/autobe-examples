import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_filter_by_banned_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Filter customers with banned=true
  const bannedCustomers =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: { banned: true } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(bannedCustomers);
  // Verify all returned customers are banned
  TestValidator.predicate(
    "all banned customers have banned=true",
    !ArrayUtil.has(bannedCustomers.data, (c) => c.banned !== true),
  );
  // 3. Filter customers with banned=false
  const activeCustomers =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: { banned: false } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomers);
  // Verify all returned customers are active (not banned)
  TestValidator.predicate(
    "all active customers have banned=false",
    !ArrayUtil.has(activeCustomers.data, (c) => c.banned !== false),
  );
}
