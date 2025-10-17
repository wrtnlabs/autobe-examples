import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";

export async function test_api_discussion_board_category_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        displayName: `Admin ${RandomGenerator.name()}`,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a discussion board category
  const categoryName = `Category ${RandomGenerator.name(2)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "created category name matches",
    category.name,
    categoryName,
  );

  // 3. Delete the created category as admin
  await api.functional.discussionBoard.admin.discussionBoardCategories.erase(
    connection,
    {
      discussionBoardCategoryId: category.id,
    },
  );

  // 4. Attempt to delete the same category again should throw error
  await TestValidator.error(
    "attempt to delete already deleted category should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardCategories.erase(
        connection,
        {
          discussionBoardCategoryId: category.id,
        },
      );
    },
  );

  // 5. Attempt to delete a non-existent valid UUID category
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardCategories.erase(
        connection,
        {
          discussionBoardCategoryId: fakeCategoryId,
        },
      );
    },
  );

  // 6. Attempt deletion without proper admin auth (simulate by using connection without auth)
  // For this test, create a new connection object without headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // First create a new category again for testing unauthorized delete
  const secondCategory: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: {
          name: `Second ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(secondCategory);

  await TestValidator.error(
    "unauthorized user cannot delete category",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardCategories.erase(
        unauthenticatedConnection,
        {
          discussionBoardCategoryId: secondCategory.id,
        },
      );
    },
  );
}
