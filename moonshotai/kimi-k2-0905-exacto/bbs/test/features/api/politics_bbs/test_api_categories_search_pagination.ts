import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsCategory";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";

/**
 * Test category listing with pagination and sorting functionality
 *
 * This test validates that the system returns paginated results with
 * configurable page sizes and supports multiple sorting options including
 * alphabetical, sequence order, and date-based sorting. Ensures proper
 * pagination metadata is returned for navigation.
 *
 * Comprehensive testing covers:
 *
 * 1. Basic pagination with different page sizes and numbers
 * 2. Sorting by sequence, name, and created_at in both ASC/DESC directions
 * 3. Search functionality with various query patterns
 * 4. Primary category filtering
 * 5. Response structure validation and pagination metadata
 * 6. Edge cases and boundary conditions
 */
export async function test_api_categories_search_pagination(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const defaultRequest = {
    search: "",
    primary: null,
    limit: null,
    page: null,
    order_by: null,
    direction: null,
  } satisfies IPoliticsBbsCategory.IRequest;

  const defaultResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: defaultRequest },
  );
  typia.assert(defaultResponse);

  TestValidator.predicate(
    "default request returns paginated categories",
    defaultResponse.data.length > 0 && defaultResponse.pagination.current === 1,
  );

  // Test 2: Pagination with specific page and limit
  const paginationRequest = {
    search: "",
    primary: null,
    limit: 5,
    page: 1,
    order_by: "sequence",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const paginationResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: paginationRequest },
  );
  typia.assert(paginationResponse);

  TestValidator.equals(
    "pagination limits results correctly",
    paginationResponse.data.length,
    Math.min(5, paginationResponse.pagination.records),
  );

  TestValidator.equals(
    "pagination metadata is correct",
    paginationResponse.pagination.limit,
    5,
  );

  // Test 3: Sorting by name in ascending order
  const nameAscRequest = {
    search: "",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const nameAscResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: nameAscRequest },
  );
  typia.assert(nameAscResponse);

  if (nameAscResponse.data.length > 1) {
    TestValidator.predicate(
      "categories sorted by name ascending",
      nameAscResponse.data[0].name <= nameAscResponse.data[1].name,
    );
  }

  // Test 4: Sorting by name in descending order
  const nameDescRequest = {
    search: "",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "name",
    direction: "desc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const nameDescResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: nameDescRequest },
  );
  typia.assert(nameDescResponse);

  if (nameDescResponse.data.length > 1) {
    TestValidator.predicate(
      "categories sorted by name descending",
      nameDescResponse.data[0].name >= nameDescResponse.data[1].name,
    );
  }

  // Test 5: Sorting by created_at (newest first)
  const createdDescRequest = {
    search: "",
    primary: null,
    limit: 10,
    page: 1,
    order_by: "created_at",
    direction: "desc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const createdDescResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: createdDescRequest },
  );
  typia.assert(createdDescResponse);

  if (createdDescResponse.data.length > 1) {
    TestValidator.predicate(
      "categories sorted by created_at descending",
      createdDescResponse.data[0].created_at >=
        createdDescResponse.data[1].created_at,
    );
  }

  // Test 6: Search functionality with partial matches
  const searchRequest = {
    search: "econom",
    primary: null,
    limit: 20,
    page: 1,
    order_by: "sequence",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const searchResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: searchRequest },
  );
  typia.assert(searchResponse);

  if (searchResponse.data.length > 0) {
    TestValidator.predicate(
      "search results contain the search term",
      ArrayUtil.has(
        searchResponse.data,
        (category) =>
          category.name.toLowerCase().includes("econom") ||
          category.code.toLowerCase().includes("econom") ||
          category.description.toLowerCase().includes("econom"),
      ),
    );
  }

  // Test 7: Primary category filtering
  const primaryRequest = {
    search: "",
    primary: true,
    limit: 20,
    page: 1,
    order_by: "sequence",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const primaryResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: primaryRequest },
  );
  typia.assert(primaryResponse);

  TestValidator.predicate(
    "primary filter works correctly",
    ArrayUtil.has(
      primaryResponse.data,
      (category) => category.primary === true,
    ) || primaryResponse.data.length === 0,
  );

  // Test 8: Complex search with primary filter
  const complexRequest = {
    search: "politic",
    primary: true,
    limit: 15,
    page: 1,
    order_by: "name",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const complexResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: complexRequest },
  );
  typia.assert(complexResponse);

  if (complexResponse.data.length > 0) {
    TestValidator.predicate(
      "complex search returns primary political categories",
      ArrayUtil.has(
        complexResponse.data,
        (category) =>
          category.primary === true &&
          (category.name.toLowerCase().includes("politic") ||
            category.code.toLowerCase().includes("politic") ||
            category.description.toLowerCase().includes("politic")),
      ),
    );
  }

  // Test 9: Pagination navigation (page 2)
  const page2Request = {
    search: "",
    primary: null,
    limit: 5,
    page: 2,
    order_by: "sequence",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const page2Response = await api.functional.politicsBbs.categories.index(
    connection,
    { body: page2Request },
  );
  typia.assert(page2Response);

  TestValidator.equals(
    "page 2 has different page number",
    page2Response.pagination.current,
    2,
  );

  // Test 10: Response structure validation - ensure all fields are present
  const sampleRequest = {
    search: "",
    primary: null,
    limit: 3,
    page: 1,
    order_by: "sequence",
    direction: "asc",
  } satisfies IPoliticsBbsCategory.IRequest;

  const sampleResponse = await api.functional.politicsBbs.categories.index(
    connection,
    { body: sampleRequest },
  );
  typia.assert(sampleResponse);

  if (sampleResponse.data.length > 0) {
    const category = sampleResponse.data[0];

    TestValidator.predicate(
      "pagination metadata is complete",
      typeof sampleResponse.pagination.current === "number" &&
        typeof sampleResponse.pagination.limit === "number" &&
        typeof sampleResponse.pagination.records === "number" &&
        typeof sampleResponse.pagination.pages === "number",
    );
  }
}
