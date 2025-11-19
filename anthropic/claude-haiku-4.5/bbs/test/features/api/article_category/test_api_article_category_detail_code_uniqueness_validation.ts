import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_detail_code_uniqueness_validation(
  connection: api.IConnection,
) {
  /**
   * Test 1: Retrieve category and validate code format compliance Generate a
   * random UUID to use as categoryId for the API call
   */
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryId,
    });

  typia.assert(category);

  /**
   * Validate code format: 5-50 lowercase alphanumeric characters with hyphens
   * Code must match pattern: ^[a-z0-9-]+$
   */
  TestValidator.predicate(
    "category code is between 5-50 characters",
    category.code.length >= 5 && category.code.length <= 50,
  );

  TestValidator.predicate(
    "category code contains only lowercase alphanumeric and hyphens",
    /^[a-z0-9-]+$/.test(category.code),
  );

  /**
   * Validate code doesn't start or end with hyphens Valid examples:
   * 'economic-policy', 'political-governance' Invalid examples: '-economic',
   * 'policy-', '--policy'
   */
  TestValidator.predicate(
    "category code does not start with hyphen",
    !category.code.startsWith("-"),
  );

  TestValidator.predicate(
    "category code does not end with hyphen",
    !category.code.endsWith("-"),
  );

  TestValidator.predicate(
    "category code does not contain consecutive hyphens",
    !category.code.includes("--"),
  );

  /** Validate that code is a string type and non-empty */
  TestValidator.predicate(
    "category code is a non-empty string",
    typeof category.code === "string" && category.code.length > 0,
  );

  /** Verify that the returned object contains all required properties */
  TestValidator.predicate(
    "category has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );

  TestValidator.predicate(
    "category has valid name between 10-100 characters",
    typeof category.name === "string" &&
      category.name.length >= 10 &&
      category.name.length <= 100,
  );

  TestValidator.predicate(
    "category has non-negative display order",
    category.display_order >= 0,
  );

  TestValidator.predicate(
    "category has boolean is_active property",
    typeof category.is_active === "boolean",
  );

  TestValidator.predicate(
    "category has non-negative article count",
    category.article_count >= 0,
  );

  TestValidator.predicate(
    "category has valid created_at timestamp",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );

  TestValidator.predicate(
    "category has valid updated_at timestamp",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
}
