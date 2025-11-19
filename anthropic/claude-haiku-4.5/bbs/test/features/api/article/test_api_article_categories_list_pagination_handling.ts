import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

export async function test_api_article_categories_list_pagination_handling(
  connection: api.IConnection,
) {
  // Retrieve the paginated list of article categories
  const result: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(result);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "response should contain pagination metadata",
    result.pagination !== null && result.pagination !== undefined,
  );

  const pagination = result.pagination;
  const categories = result.data;

  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // Validate pagination math: pages should equal ceiling(records / limit)
  // When limit is 0, pages should be 0
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "total pages should match ceiling(records / limit)",
      pagination.pages,
      expectedPages,
    );
  } else if (pagination.limit === 0) {
    TestValidator.equals(
      "when limit is 0, pages should be 0",
      pagination.pages,
      0,
    );
  }

  // Validate current page is within bounds
  TestValidator.predicate(
    "current page should be less than total pages",
    pagination.current < pagination.pages || pagination.pages === 0,
  );

  // Validate the returned data array matches pagination metadata
  TestValidator.predicate(
    "data array should not exceed the limit",
    categories.length <= pagination.limit || pagination.limit === 0,
  );

  // If this is the last page, verify it has the correct remaining items
  if (pagination.limit > 0 && pagination.current === pagination.pages - 1) {
    const remainingRecords =
      pagination.records - pagination.current * pagination.limit;
    TestValidator.predicate(
      "last page should contain remaining records",
      categories.length === remainingRecords || pagination.current === 0,
    );
  }

  // Validate each category has proper structure
  for (const category of categories) {
    typia.assert<IDiscussionBoardArticleCategory.ISummary>(category);

    TestValidator.predicate(
      "category id should be valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.id,
      ),
    );

    TestValidator.predicate(
      "category code should be 5-50 lowercase alphanumeric with hyphens",
      /^[a-z0-9-]{5,50}$/.test(category.code),
    );

    TestValidator.predicate(
      "category name should be 10-100 characters",
      category.name.length >= 10 && category.name.length <= 100,
    );

    TestValidator.predicate(
      "category display_order should be non-negative",
      category.display_order >= 0,
    );

    TestValidator.predicate(
      "category is_active should be boolean",
      typeof category.is_active === "boolean",
    );

    TestValidator.predicate(
      "category article_count should be non-negative",
      category.article_count >= 0,
    );
  }

  // Verify data consistency
  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records exist, data array should be empty",
      categories.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records exist, data array should not be empty",
      categories.length > 0,
    );
  }
}
