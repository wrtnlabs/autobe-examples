import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with only required fields, omitting optional
 * description.
 *
 * This validates that categories can be created with minimal data when the
 * description field is set to null. The test authenticates as moderator and
 * creates a category providing only name, slug, and sort_order while explicitly
 * setting description to null.
 *
 * Steps:
 *
 * 1. Register and authenticate as moderator
 * 2. Prepare minimal category data (name, slug, sort_order only)
 * 3. Set description to null explicitly
 * 4. Create category via API
 * 5. Validate response structure and field values
 * 6. Confirm description is null in response
 */
export async function test_api_category_creation_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Prepare minimal category creation data
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 8,
  });
  const categorySlug = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .substring(0, 50);

  const categoryData = {
    name: categoryName,
    slug: categorySlug,
    description: null,
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  // Step 3: Create category with minimal data
  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Validate response structure and values
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categoryData.slug,
  );
  TestValidator.equals(
    "description is null",
    createdCategory.description,
    null,
  );
  TestValidator.equals(
    "sort order matches",
    createdCategory.sort_order,
    categoryData.sort_order,
  );
}
