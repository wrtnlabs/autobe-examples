import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductStockLevel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductStockLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductStockLevel";
export async function test_api_product_stock_level_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test case 1: Default pagination (page=1, limit=25) and default sort (quantity descending)
  const defaultResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 25",
    defaultResponse.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "default has records",
    defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "default has pages",
    defaultResponse.pagination.pages >= 1,
  );
  TestValidator.equals("default page size", defaultResponse.data.length, 25);
  // Test case 2: Custom pagination with minimum values (page=1, limit=1)
  const minLimitResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit page",
    minLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals("minimum limit", minLimitResponse.pagination.limit, 1);
  TestValidator.equals(
    "minimum limit data length",
    minLimitResponse.data.length,
    1,
  );
  // Test case 3: Custom pagination with maximum values (page=1, limit=100)
  const maxLimitResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit page",
    maxLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  TestValidator.predicate(
    "maximum limit has data",
    maxLimitResponse.data.length > 0,
  );
  // Test case 4: Valid sorting by quantity ascending
  const quantityAscResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "quantity",
          order: "asc",
        },
      },
    );
  typia.assert(quantityAscResponse);
  TestValidator.equals(
    "sort by quantity asc count",
    quantityAscResponse.data.length,
    25,
  );
  // Test case 5: Valid sorting by quantity descending
  const quantityDescResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "quantity",
          order: "desc",
        },
      },
    );
  typia.assert(quantityDescResponse);
  TestValidator.equals(
    "sort by quantity desc count",
    quantityDescResponse.data.length,
    25,
  );
  // Test case 6: Valid sorting by warehouse_name ascending
  const warehouseAscResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "warehouse_name",
          order: "asc",
        },
      },
    );
  typia.assert(warehouseAscResponse);
  TestValidator.equals(
    "sort by warehouse_name asc count",
    warehouseAscResponse.data.length,
    25,
  );
  // Test case 7: Valid sorting by warehouse_name descending
  const warehouseDescResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "warehouse_name",
          order: "desc",
        },
      },
    );
  typia.assert(warehouseDescResponse);
  TestValidator.equals(
    "sort by warehouse_name desc count",
    warehouseDescResponse.data.length,
    25,
  );
  // Test case 8: Valid sorting by product_name ascending
  const productAscResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "product_name",
          order: "asc",
        },
      },
    );
  typia.assert(productAscResponse);
  TestValidator.equals(
    "sort by product_name asc count",
    productAscResponse.data.length,
    25,
  );
  // Test case 9: Valid sorting by product_name descending
  const productDescResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "product_name",
          order: "desc",
        },
      },
    );
  typia.assert(productDescResponse);
  TestValidator.equals(
    "sort by product_name desc count",
    productDescResponse.data.length,
    25,
  );
  // Test case 10: Valid sorting by updated_at ascending
  const updatedAtAscResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order: "asc",
        },
      },
    );
  typia.assert(updatedAtAscResponse);
  TestValidator.equals(
    "sort by updated_at asc count",
    updatedAtAscResponse.data.length,
    25,
  );
  // Test case 11: Valid sorting by updated_at descending
  const updatedAtDescResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order: "desc",
        },
      },
    );
  typia.assert(updatedAtDescResponse);
  TestValidator.equals(
    "sort by updated_at desc count",
    updatedAtDescResponse.data.length,
    25,
  );
  // Test case 12: Test invalid page: page=0
  await TestValidator.error("invalid page=0 should fail", async () => {
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: 0,
          limit: 25,
        },
      },
    );
  });
  // Test case 13: Test invalid page: page=-1
  await TestValidator.error("invalid page=-1 should fail", async () => {
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: -1,
          limit: 25,
        },
      },
    );
  });
  // Test case 14: Test invalid limit: limit=0
  await TestValidator.error("invalid limit=0 should fail", async () => {
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        },
      },
    );
  });
  // Test case 15: Test invalid limit: limit=101
  await TestValidator.error("invalid limit=101 should fail", async () => {
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 101,
        },
      },
    );
  });
  // Test case 16: Test invalid sort_by: "not_a_field"
  await TestValidator.error(
    "invalid sort_by=not_a_field should fail",
    async () => {
      await api.functional.communityPlatform.productstocklevels.index(
        connection,
        {
          body: {
            sort_by: "not_a_field" as any,
            order: "asc",
          },
        },
      );
    },
  );
  // Test case 17: Test invalid order: "not_a_value"
  await TestValidator.error(
    "invalid order=not_a_value should fail",
    async () => {
      await api.functional.communityPlatform.productstocklevels.index(
        connection,
        {
          body: {
            sort_by: "quantity",
            order: "not_a_value" as any,
          },
        },
      );
    },
  );
  // Test case 18: Test filtering by min_stock_level and max_stock_level
  const filteredResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          min_stock_level: 0,
          max_stock_level: 1000,
          sort_by: "quantity",
          order: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals("filtered count", filteredResponse.data.length, 10);
  // Test case 19: Test search by product_code or warehouse_code
  // Since we don't know specific values, we'll use a random string and expect no results
  const searchResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search has result",
    searchResponse.pagination.records <= 25,
  );
  // Test case 20: Test stock_status filter (out-of-stock)
  const outOfStockResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          stock_status: "out-of-stock",
        },
      },
    );
  typia.assert(outOfStockResponse);
  TestValidator.predicate(
    "out-of-stock has result",
    outOfStockResponse.pagination.records >= 0,
  );
  outOfStockResponse.data.forEach((stock) => {
    TestValidator.equals("out-of-stock quantity", stock.quantity, 0);
  });
}
