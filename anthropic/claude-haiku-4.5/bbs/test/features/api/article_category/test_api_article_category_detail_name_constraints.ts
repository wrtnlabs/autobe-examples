import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_detail_name_constraints(
  connection: api.IConnection,
) {
  // Test constraint enforcement by fetching multiple categories
  // and validating that all returned names respect the 10-100 character constraint

  // Generate random category IDs to test (simulating random category fetches)
  const testCategoryIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (let i = 0; i < testCategoryIds.length; i++) {
    const category = await api.functional.discussionBoard.categories.at(
      connection,
      {
        categoryId: testCategoryIds[i],
      },
    );
    typia.assert(category);

    // Validate name respects MinLength<10> constraint
    TestValidator.predicate(
      `category ${i + 1} name length >= 10 characters`,
      category.name.length >= 10,
    );

    // Validate name respects MaxLength<100> constraint
    TestValidator.predicate(
      `category ${i + 1} name length <= 100 characters`,
      category.name.length <= 100,
    );

    // Validate name is a string (human-readable format)
    TestValidator.predicate(
      `category ${i + 1} name is string type`,
      typeof category.name === "string",
    );

    // Validate name is not empty
    TestValidator.predicate(
      `category ${i + 1} name is not empty`,
      category.name.length > 0,
    );
  }

  // Validate the complete category structure with proper name constraints
  const finalCategory = await api.functional.discussionBoard.categories.at(
    connection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(finalCategory);

  // Ensure all required fields are present with correct types
  TestValidator.predicate(
    "category id is valid uuid string",
    typeof finalCategory.id === "string" && finalCategory.id.length > 0,
  );

  TestValidator.predicate(
    "category code is valid string",
    typeof finalCategory.code === "string" && finalCategory.code.length > 0,
  );

  TestValidator.predicate(
    "category name respects constraint: 10 <= length <= 100",
    finalCategory.name.length >= 10 && finalCategory.name.length <= 100,
  );

  TestValidator.predicate(
    "category display_order is non-negative integer",
    typeof finalCategory.display_order === "number" &&
      finalCategory.display_order >= 0,
  );

  TestValidator.predicate(
    "category is_active is boolean",
    typeof finalCategory.is_active === "boolean",
  );

  TestValidator.predicate(
    "category article_count is non-negative integer",
    typeof finalCategory.article_count === "number" &&
      finalCategory.article_count >= 0,
  );

  TestValidator.predicate(
    "category created_at is valid datetime string",
    typeof finalCategory.created_at === "string" &&
      finalCategory.created_at.length > 0,
  );

  TestValidator.predicate(
    "category updated_at is valid datetime string",
    typeof finalCategory.updated_at === "string" &&
      finalCategory.updated_at.length > 0,
  );
}
