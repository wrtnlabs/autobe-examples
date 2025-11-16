import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that category creation enforces unique slug constraint.
 *
 * This test validates that the discussion board category system properly
 * enforces slug uniqueness constraints. Categories use URL-safe slugs as unique
 * identifiers for routing and filtering. Duplicate slugs would cause routing
 * conflicts and inconsistent user experience.
 *
 * The test workflow:
 *
 * 1. Create a moderator account for authentication
 * 2. Create the first category with a specific slug (e.g., 'economics')
 * 3. Verify the category was created successfully
 * 4. Attempt to create a second category with the same slug
 * 5. Verify the operation fails with an appropriate error
 * 6. Confirm the unique constraint is properly enforced
 */
export async function test_api_category_creation_unique_slug_constraint(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for authentication
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
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<
          string & tags.MinLength<1> & tags.MaxLength<100>
        >(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create the first category with a specific slug
  const uniqueSlug = "economics";
  const firstCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(firstCategory);

  // Step 3: Verify the category was created successfully
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    uniqueSlug,
  );
  TestValidator.equals(
    "first category name matches",
    firstCategory.name,
    "Economics",
  );
  TestValidator.predicate(
    "category is active",
    firstCategory.is_active === true,
  );

  // Step 4: Attempt to create a second category with the same slug
  // This should fail due to unique constraint
  await TestValidator.error("duplicate slug should be rejected", async () => {
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  });

  // Step 5: Verify we can still create a category with a different slug
  const secondCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(secondCategory);

  // Step 6: Confirm the unique constraint is properly enforced
  TestValidator.notEquals(
    "second category has different slug",
    secondCategory.slug,
    firstCategory.slug,
  );
  TestValidator.equals(
    "second category slug is correct",
    secondCategory.slug,
    "politics",
  );
}
