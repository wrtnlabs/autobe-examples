import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
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

export async function test_api_customer_list_filter_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register CustomerA (to be banned)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAResult = await authorize_customer_join(customerAConnection, {
    body: {
      email: customerAEmail,
      nickname: RandomGenerator.name(1),
    },
  });
  const customerAId = customerAResult.id;
  // 3. Register CustomerB (to remain active)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBResult = await authorize_customer_join(customerBConnection, {
    body: {
      email: customerBEmail,
      nickname: RandomGenerator.name(1),
    },
  });
  const customerBId = customerBResult.id;
  // 4. Ban CustomerA
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      { customerId: customerAId },
    );
  typia.assert(bannedCustomer);
  TestValidator.equals("customerA is banned", bannedCustomer.isBanned, true);
  // 5. Filter for banned customers (isBanned: true)
  const bannedPage =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          isBanned: true,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(bannedPage);
  // All items must have isBanned: true
  TestValidator.predicate(
    "all banned items have isBanned=true",
    bannedPage.data.every((c) => c.isBanned === true),
  );
  // CustomerA must appear in banned results
  TestValidator.predicate(
    "customerA appears in banned list",
    bannedPage.data.some((c) => c.id === customerAId),
  );
  // CustomerB must NOT appear in banned results
  TestValidator.predicate(
    "customerB does not appear in banned list",
    bannedPage.data.every((c) => c.id !== customerBId),
  );
  // 6. Filter for active customers (isBanned: false)
  const activePage =
    await api.functional.shoppingMall.superAdmin.customers.index(
      superAdminConnection,
      {
        body: {
          isBanned: false,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activePage);
  // All items must have isBanned: false
  TestValidator.predicate(
    "all active items have isBanned=false",
    activePage.data.every((c) => c.isBanned === false),
  );
  // CustomerB must appear in active results
  TestValidator.predicate(
    "customerB appears in active list",
    activePage.data.some((c) => c.id === customerBId),
  );
  // CustomerA must NOT appear in active results
  TestValidator.predicate(
    "customerA does not appear in active list",
    activePage.data.every((c) => c.id !== customerAId),
  );
}
