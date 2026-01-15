import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_inventory_logs_retrieval(
  connection: api.IConnection,
) {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const inventoryLogs =
    await api.functional.shoppingMall.admin.inventory.logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "timestamp",
          order: "desc",
        } satisfies IShoppingMallInventoryLog.IRequest,
      },
    );
  typia.assert(inventoryLogs);
  TestValidator.equals(
    "inventoryLogs should contain at least 1 record",
    inventoryLogs.data.length >= 1,
    true,
  );
}
