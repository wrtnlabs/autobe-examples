import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates that category creation response includes all required fields with
 * correct types.
 *
 * This test ensures the complete category creation workflow functions correctly
 * by:
 *
 * 1. Creating a moderator account with proper authentication
 * 2. Using that moderator to create a new discussion board category
 * 3. Verifying the response includes all required fields: id, name, slug,
 *    description, display_order, is_active, article_count, created_at, and
 *    updated_at
 * 4. Confirming all fields have correct types and values according to
 *    IDiscussionBoardCategory schema
 * 5. Validating that article_count starts at 0 for newly created categories
 *
 * The test validates data integrity and API contract compliance for category
 * creation.
 */
export async function test_api_category_creation_response_includes_all_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new category with valid data
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );

  // Step 3: Validate all response fields through type assertion
  // typia.assert() performs COMPLETE validation of all types, formats, and field existence
  typia.assert(category);

  // Step 4: Verify field values match input data
  TestValidator.equals("name matches input", category.name, categoryData.name);
  TestValidator.equals("slug matches input", category.slug, categoryData.slug);
  TestValidator.equals(
    "description matches input",
    category.description,
    categoryData.description,
  );
  TestValidator.equals(
    "display_order matches input",
    category.display_order,
    categoryData.display_order,
  );
  TestValidator.equals(
    "is_active matches input",
    category.is_active,
    categoryData.is_active,
  );

  // Step 5: Verify article_count is initialized to 0 for new categories
  TestValidator.equals(
    "article_count initialized to 0",
    category.article_count,
    0,
  );
}
