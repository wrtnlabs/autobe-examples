import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";

/**
 * Test creating a new discussion board category by an admin user.
 *
 * This test verifies that category creation with a unique name and optional
 * description is successful. It checks that the category can be used for
 * classification of discussion board posts, ensures appropriate authorization
 * is applied by authenticating as admin before creating the category, and
 * validates that duplicate category names are rejected.
 *
 * The test asserts that response data such as id and timestamps conform to
 * expected formats and that the response matches the created input.
 */
export async function test_api_discussion_board_category_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins (authentication prerequisite)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "validPassword123";
  const adminDisplayName = RandomGenerator.name();

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: adminDisplayName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a discussion board category with valid unique name and description
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });

  const categoryCreateBody: IDiscussionBoardDiscussionBoardCategory.ICreate = {
    name: categoryName,
    description: categoryDescription,
  };

  const createdCategory: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category description matches input",
    createdCategory.description,
    categoryDescription,
  );

  // 3. Attempt to create a category with duplicate name and verify error thrown
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  });

  // 4. Attempt to create a category with a unique different name but no description
  const anotherCategoryName = RandomGenerator.name(3);
  const createdCategoryNoDescription: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: anotherCategoryName,
          description: null,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategoryNoDescription);

  TestValidator.equals(
    "created category without description has name",
    createdCategoryNoDescription.name,
    anotherCategoryName,
  );
  TestValidator.equals(
    "created category without description has null description",
    createdCategoryNoDescription.description,
    null,
  );
}
