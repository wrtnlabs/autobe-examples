import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_browsing_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Test pagination with different page sizes
  const smallPageResponse = await api.functional.ecommerce.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(smallPageResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "small page has pagination metadata",
    smallPageResponse.pagination.current === 1 &&
      smallPageResponse.pagination.limit === 5 &&
      smallPageResponse.pagination.records >= 0 &&
      smallPageResponse.pagination.pages >= 0,
  );
  // Test larger page size
  const largePageResponse = await api.functional.ecommerce.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(largePageResponse);
  // Validate category data structure
  if (smallPageResponse.data.length > 0) {
    const category = smallPageResponse.data[0];
    TestValidator.notEquals("category has valid ID", category.id, "");
    TestValidator.predicate(
      "category has name",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category has valid creation timestamp",
      new Date(category.created_at).toString() !== "Invalid Date",
    );
    TestValidator.predicate(
      "product count is non-negative",
      category.products_count >= 0,
    );
    // Test hierarchical relationships - parent can be null or valid category
    if (category.parent !== null) {
      TestValidator.notEquals(
        "parent category has valid ID",
        category.parent.id,
        "",
      );
      TestValidator.predicate(
        "parent category has name",
        typeof category.parent.name === "string" &&
          category.parent.name.length > 0,
      );
    }
  }
  // Test multiple pages if available
  if (smallPageResponse.pagination.pages > 1) {
    const secondPageResponse = await api.functional.ecommerce.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceCategory.IRequest,
      },
    );
    typia.assert(secondPageResponse);
    TestValidator.predicate(
      "second page has correct page number",
      secondPageResponse.pagination.current === 2,
    );
    // Verify different pages return different data
    if (
      smallPageResponse.data.length > 0 &&
      secondPageResponse.data.length > 0
    ) {
      TestValidator.notEquals(
        "first and second page have different categories",
        smallPageResponse.data[0].id,
        secondPageResponse.data[0].id,
      );
    }
  }
  // Test limit boundaries
  const maxLimitResponse = await api.functional.ecommerce.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceCategory.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.predicate(
    "max limit respects maximum constraint",
    maxLimitResponse.pagination.limit === 100,
  );
  // Validate that returned categories are properly structured
  smallPageResponse.data.forEach((category, index) => {
    TestValidator.predicate(
      `category ${index} has UUID ID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );
    TestValidator.predicate(
      `category ${index} has non-empty name`,
      category.name.trim().length > 0,
    );
    TestValidator.predicate(
      `category ${index} has valid date format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(category.created_at),
    );
  });
}
