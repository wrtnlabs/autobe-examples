import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test partial category update where only specific fields are modified while
 * others remain unchanged.
 *
 * This test validates the partial update functionality of the category update
 * endpoint. Authenticates as a moderator, creates a category with complete
 * initial data, then performs an update operation modifying only the
 * description field while leaving name, slug, and sort_order unchanged.
 * Verifies that only the description field is updated, other fields retain
 * their original values, and the updated_at timestamp reflects the modification
 * time.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as moderator
 * 2. Create category with complete data (name, slug, description, sort_order)
 * 3. Update only the description field
 * 4. Validate partial update behavior (description changed, other fields
 *    unchanged)
 * 5. Verify updated_at timestamp was modified
 */
export async function test_api_category_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create category with complete initial data
  const initialCategoryData = {
    name: "Political Discussion",
    slug: "political-discussion",
    description: "Political topics and debates",
    sort_order: 3,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: initialCategoryData,
      },
    );
  typia.assert(createdCategory);

  // Validate initial category data
  TestValidator.equals(
    "initial name",
    createdCategory.name,
    "Political Discussion",
  );
  TestValidator.equals(
    "initial slug",
    createdCategory.slug,
    "political-discussion",
  );
  TestValidator.equals(
    "initial description",
    createdCategory.description,
    "Political topics and debates",
  );
  TestValidator.equals("initial sort_order", createdCategory.sort_order, 3);

  // Step 3: Perform partial update - only modify description field
  const updateData = {
    description: "Comprehensive political analysis and discussion",
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  const updatedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate partial update results
  // Verify description was updated
  TestValidator.equals(
    "description updated to new value",
    updatedCategory.description,
    "Comprehensive political analysis and discussion",
  );

  // Verify other fields remained unchanged
  TestValidator.equals(
    "name unchanged",
    updatedCategory.name,
    "Political Discussion",
  );
  TestValidator.equals(
    "slug unchanged",
    updatedCategory.slug,
    "political-discussion",
  );
  TestValidator.equals("sort_order unchanged", updatedCategory.sort_order, 3);

  // Verify ID remains the same
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    createdCategory.id,
  );

  // Step 5: Verify updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedCategory.updated_at,
    createdCategory.updated_at,
  );

  // Verify created_at timestamp remained unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedCategory.created_at,
    createdCategory.created_at,
  );
}
