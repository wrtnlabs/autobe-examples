import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_categories_edge_cases_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with no matches - verify empty response
  const emptySearchResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        search: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        limit: 20,
      },
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no data",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pagination pages",
    emptySearchResult.pagination.pages,
    0,
  );
  // 2. Non-existent parent category filter
  const nonExistentParentId = "00000000-0000-0000-0000-000000000000";
  const noParentResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        parent_category_id: nonExistentParentId,
        limit: 20,
      },
    },
  );
  typia.assert(noParentResult);
  TestValidator.equals(
    "non-existent parent returns no data",
    noParentResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent parent pagination records",
    noParentResult.pagination.records,
    0,
  );
  // 3. Leaf category filter - is_leaf=true
  const leafCategoriesResult =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        is_leaf: true,
        limit: 20,
      },
    });
  typia.assert(leafCategoriesResult);
  TestValidator.equals(
    "leaf filter returns leaf categories only",
    leafCategoriesResult.data.every((c) => c.is_leaf === true),
    true,
  );
  // 3b. Leaf category filter - is_leaf=false
  const parentCategoriesResult =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        is_leaf: false,
        limit: 20,
      },
    });
  typia.assert(parentCategoriesResult);
  TestValidator.equals(
    "parent filter returns parent categories only",
    parentCategoriesResult.data.every((c) => c.is_leaf === false),
    true,
  );
  // 4. Maximum page size (limit=100)
  const maxPageSizeResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(maxPageSizeResult);
  TestValidator.equals(
    "max page size limit set correctly",
    maxPageSizeResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "returns at most 100 records",
    maxPageSizeResult.data.length <= 100,
  );
  // 5. Minimum page size (limit=1)
  const minPageSizeResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(minPageSizeResult);
  TestValidator.equals(
    "min page size limit set correctly",
    minPageSizeResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "returns at least 1 record on first page",
    minPageSizeResult.data.length >= 1,
  );
  // 6. Sorting by date - ascending
  const dateAscResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 20,
      },
    },
  );
  typia.assert(dateAscResult);
  TestValidator.predicate(
    "date ascending sort valid format",
    dateAscResult.data.every((c) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(c.created_at),
    ),
  );
  // 6b. Sorting by date - descending
  const dateDescResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 20,
      },
    },
  );
  typia.assert(dateDescResult);
  TestValidator.predicate(
    "date descending sort valid format",
    dateDescResult.data.every((c) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(c.created_at),
    ),
  );
  // 7. Hierarchical tree structure validation
  const treeResult = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 20,
      },
    },
  );
  typia.assert(treeResult);
  treeResult.data.forEach((category) => {
    if (category.parent) {
      TestValidator.equals(
        "parent category has id",
        typeof category.parent.id,
        "string",
      );
      TestValidator.equals(
        "parent category has name",
        typeof category.parent.name,
        "string",
      );
      typia.assert(category.parent);
    }
  });
}
