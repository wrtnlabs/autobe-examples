import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with optional description field.
 *
 * This test validates that moderators can successfully create discussion board
 * categories with descriptive text explaining the category's purpose and scope.
 * The test ensures that the description field is properly stored in the
 * database and returned in the API response, confirming that optional fields
 * work correctly when provided.
 *
 * Workflow:
 *
 * 1. Authenticate a moderator by registering with valid credentials
 * 2. Create a discussion board category with required fields and optional
 *    description
 * 3. Validate the created category response contains all expected fields
 * 4. Verify that the description is properly stored and returned
 * 5. Confirm optional fields work correctly when provided
 */
export async function test_api_category_creation_with_description(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);
  TestValidator.predicate(
    "moderator authentication should succeed",
    authenticatedModerator.token.access.length > 0,
  );

  // Step 2: Create category with description
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");
  const categoryDescription =
    "For discussing economic theories and policies. This category covers macroeconomics, microeconomics, fiscal policy, and monetary policy discussions.";
  const displayOrder = 1;
  const isActive = true;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: displayOrder,
          is_active: isActive,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate response contains all expected fields
  TestValidator.equals(
    "category name should match input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug should match input",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order should match input",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.equals(
    "category is_active should match input",
    createdCategory.is_active,
    isActive,
  );

  // Step 4: Verify description is properly stored and returned
  TestValidator.equals(
    "category description should be stored correctly",
    createdCategory.description,
    categoryDescription,
  );

  // Step 5: Verify timestamps are set
  TestValidator.predicate(
    "created_at timestamp should be present",
    createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be present",
    createdCategory.updated_at.length > 0,
  );

  // Step 6: Verify article_count is initialized
  TestValidator.equals(
    "article_count should be initialized to 0",
    createdCategory.article_count,
    0,
  );
}
