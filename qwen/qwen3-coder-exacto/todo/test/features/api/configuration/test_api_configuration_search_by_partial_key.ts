import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
export async function test_api_configuration_search_by_partial_key(
  connection: api.IConnection,
): Promise<void> {
  // Test the configuration search functionality with a partial key match
  // Test 1: Search with a partial key that should match multiple configurations
  const searchKey1 = "feature_flag";
  const result1 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: searchKey1,
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result1);
  // Validate that we got paginated results
  TestValidator.predicate(
    "search results should have pagination info",
    () => result1.pagination !== undefined,
  );
  // Test 2: Search with a more specific partial key
  const searchKey2 = "email";
  const result2 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: searchKey2,
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result2);
  // Test 3: Search with a term that should return no results
  const searchKey3 = "nonexistent_config";
  const result3 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: searchKey3,
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result3);
  // Should return empty data array but still have valid pagination
  TestValidator.equals(
    "no results should return empty data array",
    result3.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination should still be valid when no results",
    () =>
      result3.pagination !== undefined &&
      result3.pagination.current === 1 &&
      result3.pagination.limit === 10 &&
      result3.pagination.records === 0 &&
      result3.pagination.pages === 0,
  );
  // Test 4: Test pagination with a limit
  const result4 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: "feature",
        page: 1,
        limit: 1,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result4);
  // Should only return 1 result even if more exist
  TestValidator.equals(
    "pagination with limit should return correct number of items",
    result4.data.length,
    Math.min(1, result4.pagination.records),
  );
  TestValidator.predicate(
    "pagination metadata should be consistent with limit",
    () => result4.pagination.limit === 1,
  );
  // Test 5: Test with sorting options
  const result5 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: "feature",
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result5);
  TestValidator.predicate(
    "sorting parameters should be accepted",
    () => result5.pagination !== undefined,
  );
  // Test 6: Test with different sort field
  const result6 = await api.functional.todoApp.configurations.search.index(
    connection,
    {
      body: {
        search: "feature",
        page: 1,
        limit: 10,
        sort: "key",
        order: "asc",
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(result6);
  TestValidator.predicate(
    "key sorting parameters should be accepted",
    () => result6.pagination !== undefined,
  );
}
