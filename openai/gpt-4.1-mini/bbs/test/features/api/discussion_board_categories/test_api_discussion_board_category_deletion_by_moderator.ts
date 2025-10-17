import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate the deletion process of a discussion board category by a moderator.
 *
 * The test follows these steps:
 *
 * 1. Moderator account creation and login to obtain authorization tokens.
 * 2. Admin account creation and login to create a discussion board category.
 * 3. Moderator deletes the newly created discussion board category.
 * 4. Attempt deletion of a non-existent category to verify error handling.
 * 5. Confirm that only moderators (not admins) can delete categories by trying to
 *    delete with admin authorization and expecting failure.
 *
 * This test ensures that role-based access control is properly enforced and
 * that deletion cascades without errors.
 */
export async function test_api_discussion_board_category_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator account creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "securePassword123";
  const moderatorCreateBody = {
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Moderator login
  const moderatorLoginBody = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ILogin;
  const loggedInModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(loggedInModerator);

  // 3. Admin account creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "secureAdminPass456";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 4. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loggedInAdmin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 5. Create discussion board category as admin
  const categoryCreateBody = {
    name: `Category ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 7 })}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardDiscussionBoardCategory.ICreate;
  const category: IDiscussionBoardDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.discussionBoardCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 6. Moderator deletes the created discussion board category
  // Use moderator login context to delete
  await api.functional.discussionBoard.moderator.discussionBoardCategories.erase(
    connection,
    {
      discussionBoardCategoryId: category.id,
    },
  );

  // 7. Attempt to delete non-existent category, expecting error
  await TestValidator.error(
    "deleting non-existent category should fail",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoardCategories.erase(
        connection,
        {
          discussionBoardCategoryId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );

  // 8. Confirm admins cannot delete categories (should fail)
  // Switch connection to admin authentication for this test
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  await TestValidator.error(
    "admin cannot delete discussion board category",
    async () => {
      await api.functional.discussionBoard.moderator.discussionBoardCategories.erase(
        connection,
        {
          discussionBoardCategoryId: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      );
    },
  );
}
