import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that discussion board categories can be retrieved publicly by any user
 * without authentication.
 *
 * This test validates the public read capability of discussion board
 * categories:
 *
 * 1. A moderator is registered to create test category data
 * 2. A category is created with complete metadata through the moderator endpoint
 * 3. The category is retrieved publicly using the public GET endpoint
 * 4. All category metadata is validated to confirm proper data accessibility
 * 5. Public access works without authentication, confirming categories are
 *    available for UI rendering
 *
 * This ensures that frontend applications can display categories for navigation
 * and filtering without requiring user authentication.
 */
export async function test_api_category_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account to create test category data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorDisplayName = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined && moderator.token !== undefined,
  );

  // Step 2: Create a category through the moderator endpoint with specific metadata
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categorySlug = RandomGenerator.alphaNumeric(12).toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const categoryDisplayOrder = 1;
  const categoryIsActive = true;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: categoryDisplayOrder,
          is_active: categoryIsActive,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.predicate(
    "category created with valid ID",
    createdCategory.id !== undefined && createdCategory.id.length > 0,
  );

  // Step 3: Create a public connection without authentication headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve the created category using the public endpoint
  const retrievedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(publicConnection, {
      categoryId: createdCategory.id,
    });
  typia.assert(retrievedCategory);

  // Step 5: Validate all category metadata matches and is properly returned
  TestValidator.equals(
    "retrieved category ID matches created category",
    retrievedCategory.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "retrieved category name matches created category",
    retrievedCategory.name,
    createdCategory.name,
  );

  TestValidator.equals(
    "retrieved category slug matches created category",
    retrievedCategory.slug,
    createdCategory.slug,
  );

  TestValidator.equals(
    "retrieved category description matches created category",
    retrievedCategory.description,
    createdCategory.description,
  );

  TestValidator.equals(
    "retrieved category display_order matches created category",
    retrievedCategory.display_order,
    createdCategory.display_order,
  );

  TestValidator.equals(
    "retrieved category is_active matches created category",
    retrievedCategory.is_active,
    createdCategory.is_active,
  );

  TestValidator.predicate(
    "retrieved category article_count is non-negative",
    retrievedCategory.article_count >= 0,
  );

  TestValidator.predicate(
    "retrieved category has created_at timestamp",
    retrievedCategory.created_at !== undefined &&
      retrievedCategory.created_at.length > 0,
  );

  TestValidator.predicate(
    "retrieved category has updated_at timestamp",
    retrievedCategory.updated_at !== undefined &&
      retrievedCategory.updated_at.length > 0,
  );

  // Step 6: Verify public access works without authentication
  TestValidator.predicate(
    "public connection has no authorization header",
    publicConnection.headers === undefined ||
      publicConnection.headers.Authorization === undefined,
  );

  TestValidator.predicate(
    "category retrieval succeeded without authentication",
    retrievedCategory.id === createdCategory.id,
  );
}
