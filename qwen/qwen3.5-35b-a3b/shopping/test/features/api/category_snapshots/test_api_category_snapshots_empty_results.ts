import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_snapshots_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Non-existent category UUID with future date range
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  const farFutureDate = new Date("2099-12-31T23:59:59.999Z").toISOString();
  const response1 = await api.functional.ecommerceMall.category_snapshots.index(
    connection,
    {
      body: {
        ecommerce_mall_category_id: nonExistentUuid,
        snapshot_created_at_from: farFutureDate,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategorySnapshot.IRequest,
    },
  );
  typia.assert(response1);
  TestValidator.equals(
    "pagination records zero for non-existent category",
    response1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for non-existent category",
    response1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page one",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit twenty",
    response1.pagination.limit,
    20,
  );
  TestValidator.equals("data array empty", response1.data.length, 0);
  // Scenario 2: Unique name filter unlikely to match
  const uniqueName = `NONEXISTENT_CATEGORY_${typia.random<string & tags.Format<"uuid">>()}`;
  const response2 = await api.functional.ecommerceMall.category_snapshots.index(
    connection,
    {
      body: {
        name: uniqueName,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategorySnapshot.IRequest,
    },
  );
  typia.assert(response2);
  TestValidator.equals(
    "pagination records zero for unique name",
    response2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for unique name",
    response2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page one",
    response2.pagination.current,
    1,
  );
  TestValidator.equals("data array empty", response2.data.length, 0);
  // Scenario 3: is_leaf filter with specific boolean value and future date
  const response3 = await api.functional.ecommerceMall.category_snapshots.index(
    connection,
    {
      body: {
        is_leaf: true,
        snapshot_created_at_from: farFutureDate,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategorySnapshot.IRequest,
    },
  );
  typia.assert(response3);
  TestValidator.equals(
    "pagination records zero for leaf filter",
    response3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for leaf filter",
    response3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page one",
    response3.pagination.current,
    1,
  );
  TestValidator.equals("data array empty", response3.data.length, 0);
  // Scenario 4: Multiple conflicting filters with different limit
  const response4 = await api.functional.ecommerceMall.category_snapshots.index(
    connection,
    {
      body: {
        ecommerce_mall_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        name: `ANOTHER_NONEXISTENT_${typia.random<string & tags.Format<"uuid">>()}`,
        is_leaf: false,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallCategorySnapshot.IRequest,
    },
  );
  typia.assert(response4);
  TestValidator.equals(
    "pagination records zero for multiple filters",
    response4.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for multiple filters",
    response4.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page one",
    response4.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit ten", response4.pagination.limit, 10);
  TestValidator.equals("data array empty", response4.data.length, 0);
  // Scenario 5: Date range filter with no results
  const currentDate = new Date().toISOString();
  const response5 = await api.functional.ecommerceMall.category_snapshots.index(
    connection,
    {
      body: {
        snapshot_created_at_from: currentDate,
        snapshot_created_at_to: currentDate,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategorySnapshot.IRequest,
    },
  );
  typia.assert(response5);
  TestValidator.equals(
    "pagination records zero for exact date range",
    response5.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero for exact date range",
    response5.pagination.pages,
    0,
  );
  TestValidator.equals("data array empty", response5.data.length, 0);
}
