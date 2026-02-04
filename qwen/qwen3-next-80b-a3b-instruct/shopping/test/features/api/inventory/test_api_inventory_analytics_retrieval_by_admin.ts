import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_analytics_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as admin using the utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@company.com",
      password: "securePassword123",
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // Step 3: Use the authenticated admin connection to call the analytics endpoint
  const inventoryAnalytics: IPageIShoppingMallInventoryRecord =
    await api.functional.shoppingMall.admin.inventories.analytics.index(
      adminConnection,
    );
  // Step 4: Validate the response structure with typia.assert()
  typia.assert(inventoryAnalytics);
  // Step 5: Verify the response is not empty
  TestValidator.predicate(
    "inventory analytics data exists",
    inventoryAnalytics.data.length > 0,
  );
}
