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

export async function test_api_category_hierarchy_structure(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve top-level categories (parentCategoryId = null)
  const topLevelResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(topLevelResponse);
  // Validate pagination structure
  TestValidator.equals(
    "top-level pagination current page",
    topLevelResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "top-level pagination limit",
    topLevelResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "top-level pagination records non-negative",
    topLevelResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "top-level pagination pages non-negative",
    topLevelResponse.pagination.pages >= 0,
  );
  // Validate top-level categories have parent = null
  for (const category of topLevelResponse.data) {
    TestValidator.equals(
      `top-level category ${category.id} parent is null`,
      category.parent,
      null,
    );
    typia.assert(category);
    TestValidator.predicate(
      "category name non-empty",
      category.name.length > 0,
    );
    TestValidator.predicate(
      "category name length within bounds",
      category.name.length >= 1 && category.name.length <= 100,
    );
    TestValidator.predicate(
      "category isLeaf is boolean",
      typeof category.isLeaf === "boolean",
    );
    TestValidator.predicate(
      "category createdAt is valid date-time",
      /^\d{4}-\d{2}-\d{2}T/.test(category.createdAt),
    );
  }
  // Test 2: Retrieve all categories with search to simulate hierarchy
  const searchResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        searchQuery: "Electronics",
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 50,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate search pagination
  TestValidator.equals(
    "search pagination current page",
    searchResponse.pagination.current,
    1,
  );
  // Test 3: Test with name filter
  const nameFilteredResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        name: "Phone",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(nameFilteredResponse);
  // Validate name filter results
  for (const category of nameFilteredResponse.data) {
    TestValidator.predicate(
      `name filter category contains search term`,
      category.name.toLowerCase().includes("phone".toLowerCase()),
    );
    typia.assert(category);
  }
  // Test 4: Test with description filter
  const descFilteredResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        description: "Consumer Electronics",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(descFilteredResponse);
  // Test 5: Test pagination edge cases - limit boundaries
  const minLimitResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination limit",
    minLimitResponse.pagination.limit,
    10,
  );
  const maxLimitResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 6: Test sorting variations
  const ascendingResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(ascendingResponse);
  const descendingResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        sortBy: "name",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(descendingResponse);
  const dateSortResponse = await api.functional.ecommerceMall.categories.index(
    connection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(dateSortResponse);
  // Test 7: Test includeInactive flag
  const activeOnlyResponse =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: {
        includeInactive: false,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // Test 8: Validate all category responses have required fields
  const allResponses = [
    topLevelResponse,
    searchResponse,
    nameFilteredResponse,
    descFilteredResponse,
    minLimitResponse,
    maxLimitResponse,
    ascendingResponse,
    descendingResponse,
    dateSortResponse,
    activeOnlyResponse,
  ];
  for (const response of allResponses) {
    typia.assert(response);
    TestValidator.equals(
      "pagination records matches data length",
      response.data.length,
      response.pagination.records,
    );
    for (const category of response.data) {
      typia.assert(category);
      // Validate category has required fields
      TestValidator.predicate(
        "category has valid id uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          category.id,
        ),
      );
      TestValidator.predicate("category has name", category.name !== undefined);
      TestValidator.predicate(
        "category isLeaf exists",
        category.isLeaf !== undefined,
      );
      TestValidator.predicate(
        "category createdAt exists",
        category.createdAt !== undefined,
      );
      // Validate parent field can be null or has complete data
      if (category.parent !== null && category.parent !== undefined) {
        typia.assert(category.parent);
        TestValidator.predicate(
          "parent has valid id uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            category.parent.id,
          ),
        );
        TestValidator.predicate(
          "parent has name",
          category.parent.name !== undefined,
        );
      }
    }
  }
}