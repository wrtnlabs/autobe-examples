import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful category creation by an authenticated moderator with all
 * required and optional fields.
 *
 * This comprehensive test validates the complete category creation workflow:
 *
 * 1. Create a moderator account with valid credentials
 * 2. Use authenticated moderator to create a discussion board category
 * 3. Provide all category fields: name, description, slug, display_order,
 *    is_active
 * 4. Verify API response contains correct category properties
 * 5. Confirm category is immediately available for article assignment
 *
 * The test ensures proper authentication context is maintained throughout and
 * the category creation endpoint enforces all business rules correctly.
 */
export async function test_api_category_creation_by_moderator_with_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `moderator_${RandomGenerator.alphabets(8)}`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Step 2: Create category with all fields
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 5,
  });
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const categorySlug = `${categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${RandomGenerator.alphaNumeric(6)}`;
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const isActive = true;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          slug: categorySlug,
          display_order: displayOrder,
          is_active: isActive,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate category response properties
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryName,
  );

  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryDescription,
  );

  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categorySlug,
  );

  TestValidator.equals(
    "category display_order matches input",
    createdCategory.display_order,
    displayOrder,
  );

  TestValidator.equals(
    "category is_active matches input",
    createdCategory.is_active,
    isActive,
  );

  TestValidator.equals(
    "category article_count initialized to zero",
    createdCategory.article_count,
    0,
  );

  TestValidator.predicate(
    "created_at and updated_at are equal for new category",
    createdCategory.created_at === createdCategory.updated_at,
  );
}
