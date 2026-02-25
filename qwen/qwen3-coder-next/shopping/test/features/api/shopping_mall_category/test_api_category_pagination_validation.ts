import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination (no parameters)
  const defaultResult =
    await api.functional.shoppingMall.categories.at(connection);
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination current is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default pagination has positive limit",
    defaultResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination records >= 0",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.equals(
    "default pagination pages calculation",
    defaultResult.pagination.pages,
    defaultResult.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultResult.pagination.records / defaultResult.pagination.limit,
        ),
  );
  TestValidator.equals(
    "default data length equals limit",
    defaultResult.data.length,
    defaultResult.pagination.limit,
  );
  // 2. Test pagination with explicit page and limit parameters
  const page = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const limit = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const paginatedResult =
    await api.functional.shoppingMall.categories.at(connection);
  typia.assert(paginatedResult);
  TestValidator.equals(
    "custom pagination current",
    paginatedResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "custom pagination limit",
    paginatedResult.pagination.limit,
    limit,
  );
  // Verify pages calculation
  const expectedPages =
    paginatedResult.pagination.records === 0
      ? 0
      : Math.ceil(
          paginatedResult.pagination.records / paginatedResult.pagination.limit,
        );
  TestValidator.equals(
    "custom pagination pages calculation",
    paginatedResult.pagination.pages,
    expectedPages,
  );
  // 3. Test boundary conditions
  // Minimum values: page=1, limit=1
  const minResult = await api.functional.shoppingMall.categories.at(connection);
  typia.assert(minResult);
  TestValidator.equals(
    "minimum pagination current",
    minResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimum pagination limit",
    minResult.pagination.limit,
    1,
  );
  // Maximum values: page=100, limit=100
  const maxResult = await api.functional.shoppingMall.categories.at(connection);
  typia.assert(maxResult);
  TestValidator.equals(
    "maximum pagination current",
    maxResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "maximum pagination limit",
    maxResult.pagination.limit,
    100,
  );
  // 4. Test first page (page=1)
  const firstPageResult =
    await api.functional.shoppingMall.categories.at(connection);
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page current is 1",
    firstPageResult.pagination.current,
    1,
  );
  // 5. Test data structure
  if (firstPageResult.data.length > 0) {
    const firstCategory = firstPageResult.data[0];
    typia.assert<IShoppingMallCategory.ISummary>(firstCategory);
    TestValidator.predicate(
      "category has valid UUID",
      /^[0-9a-f-]{36}$/i.test(firstCategory.id),
    );
    TestValidator.equals(
      "category has name",
      typeof firstCategory.name,
      "string",
    );
    TestValidator.predicate(
      "category has description or null",
      firstCategory.description === null ||
        typeof firstCategory.description === "string",
    );
    TestValidator.predicate(
      "category has valid parent or null",
      firstCategory.parent === null ||
        typeof firstCategory.parent.id === "string",
    );
    TestValidator.predicate(
      "subcategory count is non-negative",
      firstCategory.subcategory_count >= 0,
    );
  }
  // 6. Test pagination consistency across multiple calls
  const result1 = await api.functional.shoppingMall.categories.at(connection);
  const result2 = await api.functional.shoppingMall.categories.at(connection);
  const result3 = await api.functional.shoppingMall.categories.at(connection);
  typia.assert(result1);
  typia.assert(result2);
  typia.assert(result3);
  TestValidator.equals(
    "pagination consistent across calls",
    result1.pagination.records,
    result2.pagination.records,
  );
  TestValidator.equals(
    "pagination consistent across calls",
    result2.pagination.records,
    result3.pagination.records,
  );
}
