import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that article categories can be retrieved publicly without
 * authentication.
 *
 * This test validates that category information is accessible to all user types
 * (guests, members, moderators) since categories are fundamental navigation
 * elements. The test creates a category with complete metadata (name, slug,
 * description, sort_order), then retrieves it by ID without authentication and
 * validates all fields are returned correctly including timestamps.
 *
 * This ensures the category detail endpoint supports article categorization
 * workflows and category browsing interfaces for all users regardless of
 * authentication status.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator to create test data
 * 2. Create a category with complete metadata
 * 3. Create an unauthenticated connection
 * 4. Retrieve the category without authentication
 * 5. Validate all category fields match expected values
 */
export async function test_api_category_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category with complete metadata
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const sortOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          sort_order: sortOrder,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Create an unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve the category without authentication
  const retrievedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(unauthConnection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 5: Validate all category fields match expected values
  TestValidator.equals(
    "category ID matches",
    retrievedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    retrievedCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category description matches",
    retrievedCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "category sort_order matches",
    retrievedCategory.sort_order,
    sortOrder,
  );
  TestValidator.equals(
    "category created_at matches",
    retrievedCategory.created_at,
    createdCategory.created_at,
  );
  TestValidator.equals(
    "category updated_at matches",
    retrievedCategory.updated_at,
    createdCategory.updated_at,
  );
}
