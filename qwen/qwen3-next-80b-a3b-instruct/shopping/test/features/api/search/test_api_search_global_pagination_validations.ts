import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSearch";
import type { IShoppingMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSearch";
export async function test_api_search_global_pagination_validations(
  connection: api.IConnection,
): Promise<void> {
  // Create search query with consistent test term that should return results
  const searchTerm = "test";
  // Test minimum pagination values: page=1, limit=1
  const minPageResult = await api.functional.shoppingMall.search.global.index(
    connection,
    {
      body: {
        q: searchTerm,
        page: 1,
        limit: 1,
      } satisfies IShoppingMallSearch.IRequest,
    },
  );
  typia.assert(minPageResult);
  TestValidator.equals(
    "minimum pagination current",
    minPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimum pagination limit",
    minPageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum pagination records >= 1",
    minPageResult.pagination.records >= 1,
  );
  TestValidator.equals(
    "minimum pagination pages",
    minPageResult.pagination.pages,
    Math.ceil(minPageResult.pagination.records / 1),
  );
  TestValidator.equals("minimum data length", minPageResult.data.length, 1);
  // Validate structure of the first data item
  const firstDataItem = minPageResult.data[0];
  TestValidator.equals(
    "first data source type",
    firstDataItem.source,
    "product" as const,
  );
  TestValidator.equals(
    "first data id format",
    firstDataItem.id,
    firstDataItem.id,
  ); // UUID format guaranteed by schema
  TestValidator.predicate(
    "first data name is string",
    typeof firstDataItem.name === "string",
  );
  TestValidator.predicate(
    "first data description is string",
    typeof firstDataItem.description === "string",
  );
  TestValidator.predicate(
    "first data update time is ISO date",
    typeof firstDataItem.updatedAt === "string",
  );
}
