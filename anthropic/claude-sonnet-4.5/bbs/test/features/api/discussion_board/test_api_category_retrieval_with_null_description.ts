import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category retrieval when the category has a null description field.
 *
 * This validates that categories with optional description field set to null
 * are handled correctly in the response. The test creates a category with name,
 * slug, and sort_order but explicitly sets description to null, then retrieves
 * it and verifies the response includes all required fields with description
 * properly represented as null.
 *
 * Process:
 *
 * 1. Authenticate as moderator to gain category creation permissions
 * 2. Create a category with explicit null description
 * 3. Retrieve the created category by ID
 * 4. Validate that description field is null and other fields match
 */
export async function test_api_category_retrieval_with_null_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create category with null description
  const categoryData = {
    name: RandomGenerator.name(2),
    slug:
      RandomGenerator.alphaNumeric(5).toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5).toLowerCase(),
    description: null,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Retrieve the category by ID
  const retrievedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 4: Validate the retrieved category
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "category description is null",
    retrievedCategory.description,
    null,
  );
  TestValidator.equals(
    "category sort_order matches",
    retrievedCategory.sort_order,
    categoryData.sort_order,
  );
}
