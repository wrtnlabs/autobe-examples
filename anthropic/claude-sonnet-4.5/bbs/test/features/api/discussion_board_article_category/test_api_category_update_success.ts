import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful category update workflow by a moderator.
 *
 * This test validates the complete workflow of updating an article category:
 *
 * 1. Authenticate as a moderator to obtain moderation privileges
 * 2. Create an initial category with specific values
 * 3. Update the category with new values for all editable fields
 * 4. Verify all updated fields are correctly persisted
 * 5. Verify updated_at timestamp reflects the modification
 *
 * The test ensures that moderators can successfully modify category properties
 * including name, slug, description, and sort_order, and that the changes are
 * properly reflected in the returned category object.
 */
export async function test_api_category_update_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create initial category
  const initialCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Topics related to economics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(initialCategory);

  // Verify initial category values
  TestValidator.equals(
    "initial name",
    initialCategory.name,
    "Economic Discussion",
  );
  TestValidator.equals(
    "initial slug",
    initialCategory.slug,
    "economic-discussion",
  );
  TestValidator.equals(
    "initial description",
    initialCategory.description,
    "Topics related to economics",
  );
  TestValidator.equals("initial sort_order", initialCategory.sort_order, 1);

  // Step 3: Update the category with new values
  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: initialCategory.id,
        body: {
          name: "Economic Policy Discussion",
          slug: "economic-policy-discussion",
          description: "In-depth economic policy analysis and debates",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify all updated fields
  TestValidator.equals(
    "updated name",
    updatedCategory.name,
    "Economic Policy Discussion",
  );
  TestValidator.equals(
    "updated slug",
    updatedCategory.slug,
    "economic-policy-discussion",
  );
  TestValidator.equals(
    "updated description",
    updatedCategory.description,
    "In-depth economic policy analysis and debates",
  );
  TestValidator.equals("updated sort_order", updatedCategory.sort_order, 2);

  // Verify category ID remains unchanged
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    initialCategory.id,
  );

  // Step 5: Verify updated_at timestamp is newer than created_at
  const createdAt = new Date(updatedCategory.created_at).getTime();
  const updatedAt = new Date(updatedCategory.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt >= createdAt,
  );
}
