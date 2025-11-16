import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation when optional description field is omitted or set to
 * null.
 *
 * This test validates that a moderator can successfully create a discussion
 * board category without providing a description. The scenario covers:
 *
 * 1. Moderator authentication and registration
 * 2. Category creation with required fields only (name, slug, display_order,
 *    is_active)
 * 3. Verification that description field is null in the created category response
 * 4. Validation that categories without descriptions are fully functional
 *
 * Steps:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Create a category with required fields, omitting the optional description
 * 3. Verify the created category has null description field
 * 4. Verify all other fields match the input values
 * 5. Confirm the category can be retrieved and used normally despite missing
 *    description
 */
export async function test_api_category_creation_without_description(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(15).slice(0, 20),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category without description (omitted entirely)
  const categoryName: string = RandomGenerator.paragraph({ sentences: 1 });
  const categorySlug: string = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const displayOrder: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const isActive: boolean = true;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: displayOrder,
          is_active: isActive,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Verify the created category has null description
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.equals(
    "category display_order matches",
    createdCategory.display_order,
    displayOrder,
  );
  TestValidator.equals(
    "category is_active matches",
    createdCategory.is_active,
    isActive,
  );
  TestValidator.equals(
    "category description is null",
    createdCategory.description,
    null,
  );

  // Step 4: Verify category structure with all required fields
  TestValidator.predicate(
    "category has valid id",
    createdCategory.id !== null && createdCategory.id !== undefined,
  );
  TestValidator.predicate(
    "category has created_at timestamp",
    createdCategory.created_at !== null &&
      createdCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    createdCategory.updated_at !== null &&
      createdCategory.updated_at !== undefined,
  );
  TestValidator.equals(
    "category article_count is zero",
    createdCategory.article_count,
    0,
  );

  // Step 5: Create another category with explicit null description to verify same behavior
  const categoryName2: string = RandomGenerator.paragraph({ sentences: 1 });
  const categorySlug2: string = categoryName2
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const displayOrder2: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: categoryName2,
          slug: categorySlug2,
          display_order: displayOrder2,
          is_active: true,
          description: null,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory2);

  // Verify second category also has null description
  TestValidator.equals(
    "second category description is null",
    createdCategory2.description,
    null,
  );
  TestValidator.equals(
    "second category name matches",
    createdCategory2.name,
    categoryName2,
  );
}
