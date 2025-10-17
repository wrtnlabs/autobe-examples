import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test administrator creating a new discussion board category.
 *
 * This test validates the complete workflow for an administrator to create a
 * new top-level category in the discussion board system. Categories are
 * essential for organizing economic and political discussions into logical
 * subject areas.
 *
 * Workflow:
 *
 * 1. Administrator registers a new account and obtains authorization
 * 2. Administrator creates a new top-level category with name, slug, description,
 *    display order, and active status
 * 3. Verify the category is created successfully with proper ID, timestamps, and
 *    initialized topic_count
 * 4. Confirm all category properties are correctly set and match input values
 */
export async function test_api_category_creation_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and authentication
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuth);

  // Step 2: Create a new top-level category
  const categoryName = RandomGenerator.name(2);
  const categorySlug = categoryName.toLowerCase().replace(/\s+/g, "-");

  const categoryData = {
    name: categoryName,
    slug: categorySlug,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 3: Validate created category properties match input
  TestValidator.equals(
    "category name matches input",
    createdCategory.name,
    categoryData.name,
  );

  TestValidator.equals(
    "category slug matches input",
    createdCategory.slug,
    categoryData.slug,
  );

  TestValidator.equals(
    "category description matches input",
    createdCategory.description,
    categoryData.description,
  );

  TestValidator.equals(
    "parent category ID is null for top-level",
    createdCategory.parent_category_id,
    null,
  );

  TestValidator.equals(
    "display order matches input",
    createdCategory.display_order,
    categoryData.display_order,
  );

  TestValidator.equals("category is active", createdCategory.is_active, true);

  TestValidator.equals(
    "topic count initialized to 0",
    createdCategory.topic_count,
    0,
  );
}
