import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_order_item_snapshots_retrieval_with_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the test user fetching order item snapshots
  const testConnection: api.IConnection = { host: connection.host };
  // 1. Test scenario 1: No filters, should return paginated snapshots with valid pagination info
  const response1 = (await api.functional.shoppingMall.orderItemSnapshots.index(
    testConnection,
    {
      body: {},
    },
  )) as IPageIShoppingMallOrderItemSnapshot.ISummary;
  typia.assert(response1);
  // Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is at least 1",
    response1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // Each snapshot must be an object (empty schema)
  for (const snapshot of response1.data) {
    typia.assert(snapshot); // snapshot is an empty object type
  }
  // 2. Test scenario 2: Since filtering fields are undefined on snapshot, test with empty filter returns data
  const response2 = (await api.functional.shoppingMall.orderItemSnapshots.index(
    testConnection,
    {
      body: {},
    },
  )) as IPageIShoppingMallOrderItemSnapshot.ISummary;
  typia.assert(response2);
  TestValidator.predicate(
    "scenario 2 returns data array",
    Array.isArray(response2.data),
  );
  // 3. Test scenario 3: Filtering with a non-existent order item id should return empty data array
  const nonExistentOrderItemId = "00000000-0000-0000-0000-000000000000";
  const response3 = (await api.functional.shoppingMall.orderItemSnapshots.index(
    testConnection,
    {
      body: { shopping_mall_order_item_id: nonExistentOrderItemId },
    },
  )) as IPageIShoppingMallOrderItemSnapshot.ISummary;
  typia.assert(response3);
  TestValidator.equals(
    "empty data on non-existent order item id",
    response3.data.length,
    0,
  );
}
