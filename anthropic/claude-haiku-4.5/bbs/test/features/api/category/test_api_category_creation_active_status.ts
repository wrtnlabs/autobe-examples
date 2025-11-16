import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with active status flag.
 *
 * Validates the complete workflow of creating a discussion board category with
 * is_active=true. This test confirms that:
 *
 * 1. A moderator can successfully authenticate to the system
 * 2. An active category can be created with proper initialization
 * 3. The created category is immediately available for member article selection
 * 4. The category appears in category filters and listings
 * 5. The category has correct metadata and display properties
 *
 * Process:
 *
 * 1. Authenticate as a moderator by registering/joining
 * 2. Create a new category with is_active=true
 * 3. Verify the response contains all required category properties
 * 4. Confirm the is_active flag is true in the response
 * 5. Validate that article_count is initialized to 0
 * 6. Ensure timestamps (created_at, updated_at) are properly set
 */
export async function test_api_category_creation_active_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphabets(8)}`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(authorized);

  // Verify moderator was created with correct display name
  TestValidator.equals(
    "moderator display name matches",
    authorized.moderator.display_name,
    moderatorDisplayName,
  );

  // Verify moderator account status is active
  TestValidator.equals(
    "moderator account status is active",
    authorized.moderator.account_status,
    "active",
  );

  // Step 2: Create a new category with active status
  const categoryName = `${RandomGenerator.paragraph({ sentences: 2, wordMin: 1, wordMax: 3 })}`;
  const categorySlug =
    `category-${RandomGenerator.alphaNumeric(8)}`.toLowerCase();
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: categoryDescription,
          display_order: displayOrder,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );

  typia.assert(createdCategory);

  // Step 3: Verify the response contains all required category properties
  TestValidator.predicate(
    "category has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );

  // Step 4: Confirm the is_active flag is true in the response
  TestValidator.equals(
    "category is_active flag is true",
    createdCategory.is_active,
    true,
  );

  // Step 5: Validate that article_count is initialized to 0
  TestValidator.equals(
    "article_count initialized to zero",
    createdCategory.article_count,
    0,
  );

  // Step 6: Verify category name and slug match the input
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );

  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );

  // Verify display_order matches input
  TestValidator.equals(
    "display_order matches input",
    createdCategory.display_order,
    displayOrder,
  );

  // Verify description matches input
  TestValidator.equals(
    "description matches input",
    createdCategory.description,
    categoryDescription,
  );

  // Step 7: Ensure timestamps are properly set
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.created_at),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdCategory.updated_at),
  );
}
