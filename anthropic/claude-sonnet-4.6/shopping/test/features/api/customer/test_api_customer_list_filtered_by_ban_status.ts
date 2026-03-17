import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_customer_list_filtered_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Register two customer accounts
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerASession = await authorize_customer_join(
    customerAConnection,
    {},
  );
  typia.assert(customerASession);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBSession = await authorize_customer_join(
    customerBConnection,
    {},
  );
  typia.assert(customerBSession);
  const customerAId = customerASession.id;
  const customerBId = customerBSession.id;
  // 3. Ban customer A
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customerAId,
    },
  );
  typia.assert(bannedCustomer);
  TestValidator.equals("customer A is banned", bannedCustomer.isBanned, true);
  // 4. Filter for banned customers (isBanned: true)
  const bannedList = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        isBanned: true,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(bannedList);
  // All records must have isBanned === true
  TestValidator.predicate(
    "all banned customers have isBanned=true",
    bannedList.data.every((c) => c.isBanned === true),
  );
  // Customer A (banned) must appear in result
  TestValidator.predicate(
    "banned customer A appears in banned list",
    bannedList.data.some((c) => c.id === customerAId),
  );
  // 5. Filter for active customers (isBanned: false)
  const activeList = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        isBanned: false,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(activeList);
  // All records must have isBanned === false
  TestValidator.predicate(
    "all active customers have isBanned=false",
    activeList.data.every((c) => c.isBanned === false),
  );
  // Customer B (not banned) must appear in result
  TestValidator.predicate(
    "active customer B appears in active list",
    activeList.data.some((c) => c.id === customerBId),
  );
  // Customer A (banned) must NOT appear in the active list
  TestValidator.predicate(
    "banned customer A does not appear in active list",
    activeList.data.every((c) => c.id !== customerAId),
  );
}
