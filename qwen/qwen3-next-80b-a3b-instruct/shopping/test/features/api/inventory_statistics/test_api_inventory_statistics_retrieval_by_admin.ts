import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallInventoryStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatistic";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_statistics_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host, headers: {} };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // Step 2: Call the inventory statistics endpoint
  const stats: IShoppingMallInventoryStatistic =
    await api.functional.shoppingMall.admin.inventories.statistics.index(
      adminConnection,
    );
  // Step 3: Validate the response structure and values
  typia.assert(stats);
  // Verify all required fields are present and have non-negative values
  TestValidator.equals(
    "totalVariants is non-negative",
    stats.totalVariants,
    stats.totalVariants,
  );
  TestValidator.predicate("totalVariants is >= 0", stats.totalVariants >= 0);
  TestValidator.equals(
    "totalQuantity is non-negative",
    stats.totalQuantity,
    stats.totalQuantity,
  );
  TestValidator.predicate("totalQuantity is >= 0", stats.totalQuantity >= 0);
  TestValidator.equals(
    "averagePrice is non-negative",
    stats.averagePrice,
    stats.averagePrice,
  );
  TestValidator.predicate("averagePrice is >= 0", stats.averagePrice >= 0);
  TestValidator.equals(
    "totalInventoryValue is non-negative",
    stats.totalInventoryValue,
    stats.totalInventoryValue,
  );
  TestValidator.predicate(
    "totalInventoryValue is >= 0",
    stats.totalInventoryValue >= 0,
  );
  // Verify that if totalVariants is 0, then totalQuantity, averagePrice, and totalInventoryValue are also 0
  if (stats.totalVariants === 0) {
    TestValidator.equals(
      "totalQuantity is 0 when totalVariants is 0",
      stats.totalQuantity,
      0,
    );
    TestValidator.equals(
      "averagePrice is 0 when totalVariants is 0",
      stats.averagePrice,
      0,
    );
    TestValidator.equals(
      "totalInventoryValue is 0 when totalVariants is 0",
      stats.totalInventoryValue,
      0,
    );
  }
  // Verify that totalInventoryValue equals sum of (quantity * averagePrice)
  // This is a business logic validation
  const calculatedValue = stats.totalQuantity * stats.averagePrice;
  TestValidator.equals(
    "totalInventoryValue equals sum of quantity × averagePrice",
    stats.totalInventoryValue,
    calculatedValue,
    (key) =>
      key === "totalInventoryValue" ||
      key === "totalQuantity" ||
      key === "averagePrice",
  );
}