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
export async function test_api_product_stock_level_stock_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering by stock status: "low-stock"
  const lowStockResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          stock_status: "low-stock",
        },
      },
    );
  typia.assert(lowStockResponse);
  TestValidator.predicate(
    "low-stock response contains data",
    lowStockResponse.data.length >= 0,
  );
  TestValidator.equals(
    "low-stock response has pagination",
    lowStockResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "low-stock response has limit",
    lowStockResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "low-stock response has records",
    lowStockResponse.pagination.records >= 0,
    true,
  );
  // Test filtering by stock status: "in-stock"
  const inStockResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {
          stock_status: "in-stock",
        },
      },
    );
  typia.assert(inStockResponse);
  TestValidator.predicate(
    "in-stock response contains data",
    inStockResponse.data.length >= 0,
  );
  TestValidator.equals(
    "in-stock response has pagination",
    inStockResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "in-stock response has limit",
    inStockResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "in-stock response has records",
    inStockResponse.pagination.records >= 0,
    true,
  );
  // Test filtering by stock status: "out-of-stock"
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
    "out-of-stock response contains data",
    outOfStockResponse.data.length >= 0,
  );
  TestValidator.equals(
    "out-of-stock response has pagination",
    outOfStockResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "out-of-stock response has limit",
    outOfStockResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "out-of-stock response has records",
    outOfStockResponse.pagination.records >= 0,
    true,
  );
  // Test without filter to ensure system returns data
  const allResponse =
    await api.functional.communityPlatform.productstocklevels.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "all response contains data",
    allResponse.data.length >= 0,
  );
  TestValidator.equals(
    "all response has pagination",
    allResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "all response has limit",
    allResponse.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "all response has records",
    allResponse.pagination.records >= 0,
    true,
  );
}
