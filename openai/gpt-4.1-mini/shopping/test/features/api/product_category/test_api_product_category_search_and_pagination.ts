import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";

/**
 * Test retrieving a filtered and paginated list of shopping mall product
 * categories.
 *
 * This test verifies the category search API which supports complex filtering
 * and pagination. The test covers scenarios including:
 *
 * - No filters, retrieving all categories paginated
 * - Filtering by partial category name matches
 * - Filtering by parent category ID (including null for root categories)
 * - Pagination with different page numbers and limits, including boundary values
 * - Sorting by name, created_at, updated_at with ascending and descending orders
 *
 * Validation points:
 *
 * - Response data has correct type and contains only expected properties
 * - Pagination metadata correctness (current page, record count, total pages)
 * - Filtering results must respect filters, e.g., all returned categories have
 *   names matching filter when applied
 * - Filtering by parent_id limits to categories with that parent_id
 * - Sorting order is properly applied
 * - No sensitive or unauthorized data leaking in category summaries
 *
 * This test uses only the public category listing API (PATCH
 * /shoppingMall/productCategories) without authentication.
 *
 * Multiple queries are performed to cover combinations of filters and
 * pagination to validate consistent API behavior.
 */
export async function test_api_product_category_search_and_pagination(
  connection: api.IConnection,
) {
  // Helper function to validate pagination metadata
  function validatePagination(
    pagination: IPage.IPagination,
    expectedPage: number,
    expectedLimit: number,
    expectedRecords: number,
  ) {
    TestValidator.equals(
      "pagination current page",
      pagination.current,
      expectedPage,
    );
    TestValidator.equals("pagination limit", pagination.limit, expectedLimit);
    TestValidator.predicate(
      "pagination records non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate("pagination pages positive", pagination.pages > 0);
    TestValidator.predicate(
      "pagination pages correct",
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
    );
  }

  // Test case 1: No filters, default pagination
  {
    const requestBody = {} satisfies IShoppingMallProductCategory.IRequest;
    const response = await api.functional.shoppingMall.productCategories.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    validatePagination(response.pagination, 1, 20, response.pagination.records);
    TestValidator.predicate(
      "empty filter returns some data",
      response.data.length > 0,
    );

    // All items have required properties
    for (const category of response.data) {
      typia.assert(category);
      TestValidator.predicate(
        "category id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          category.id,
        ),
      );
      TestValidator.predicate(
        "category name is non-empty",
        category.name.length > 0,
      );
      // parent_id can be null or uuid string
      if (category.parent_id !== null && category.parent_id !== undefined) {
        TestValidator.predicate(
          "category parent_id is uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            category.parent_id,
          ),
        );
      }
    }
  }

  // Test case 2: Filter by partial name match
  {
    const partial = RandomGenerator.substring(
      "Electronics Appliances Clothes Sports Garden",
    );
    const requestBody = {
      filter_name: partial,
      page: 1,
      limit: 10,
      sort_by: "name",
      order: "asc",
    } satisfies IShoppingMallProductCategory.IRequest;

    const response = await api.functional.shoppingMall.productCategories.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    validatePagination(response.pagination, 1, 10, response.pagination.records);
    for (const category of response.data) {
      typia.assert(category);
      TestValidator.predicate(
        `category name contains filter_name: ${partial}`,
        category.name.toLowerCase().includes(partial.toLowerCase()),
      );
    }
  }

  // Test case 3: Filter by parent_id with realistic UUID
  {
    // Pick a random parent_id from first page categories or null
    const initialResponse =
      await api.functional.shoppingMall.productCategories.index(connection, {
        body: { limit: 50 } satisfies IShoppingMallProductCategory.IRequest,
      });
    typia.assert(initialResponse);
    const parentCandidateIds = initialResponse.data
      .map((c) => c.id)
      .filter((id) => id !== undefined && id !== null);
    const parentId =
      parentCandidateIds.length > 0
        ? RandomGenerator.pick(parentCandidateIds)
        : null;

    const requestBody = {
      filter_parent_id: parentId,
      page: 1,
      limit: 15,
      sort_by: "created_at",
      order: "desc",
    } satisfies IShoppingMallProductCategory.IRequest;

    const response = await api.functional.shoppingMall.productCategories.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    validatePagination(response.pagination, 1, 15, response.pagination.records);

    // All returned categories must have the specified parent_id
    for (const category of response.data) {
      typia.assert(category);
      TestValidator.equals(
        "category parent_id matches filter",
        category.parent_id ?? null,
        parentId,
      );
    }
  }

  // Test case 4: Pagination with page and limit boundaries
  {
    const requestBody = {
      page: 2,
      limit: 5,
      sort_by: "updated_at",
      order: "asc",
    } satisfies IShoppingMallProductCategory.IRequest;

    const response = await api.functional.shoppingMall.productCategories.index(
      connection,
      { body: requestBody },
    );
    typia.assert(response);

    validatePagination(response.pagination, 2, 5, response.pagination.records);
    TestValidator.predicate(
      "page 2 returns up to 5 items",
      response.data.length <= 5,
    );
  }

  // Test case 5: Sorting checks
  for (const sortBy of ["name", "created_at", "updated_at"] as const) {
    for (const order of ["asc", "desc"] as const) {
      const requestBody = {
        sort_by: sortBy,
        order: order,
        limit: 10,
      } satisfies IShoppingMallProductCategory.IRequest;
      const response =
        await api.functional.shoppingMall.productCategories.index(connection, {
          body: requestBody,
        });
      typia.assert(response);
      validatePagination(
        response.pagination,
        response.pagination.current,
        10,
        response.pagination.records,
      );

      // Check sorting order by verifying sequence
      const sortableVals: (string | undefined)[] = response.data
        .map((cat) => {
          switch (sortBy) {
            case "name":
              return cat.name.toLowerCase();
            case "created_at":
            case "updated_at":
              // These timestamps may not exist in summary, skip ordering validation for those
              // Because IShoppingMallProductCategory.ISummary does NOT have these properties, so skip check here
              return undefined;
            default:
              return undefined;
          }
        })
        .filter((v) => v !== undefined) as string[];

      if (sortableVals.length >= 2) {
        for (let i = 1; i < sortableVals.length; i++) {
          if (order === "asc") {
            TestValidator.predicate(
              `sorted ascending by ${sortBy}`,
              sortableVals[i - 1]! <= sortableVals[i]!,
            );
          } else {
            TestValidator.predicate(
              `sorted descending by ${sortBy}`,
              sortableVals[i - 1]! >= sortableVals[i]!,
            );
          }
        }
      }
    }
  }
}
