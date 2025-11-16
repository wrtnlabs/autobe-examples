import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Verify that a privileged adminUser can hard delete another admin account and
 * that subsequent operations reflect the deletion semantics.
 *
 * Business flow under test:
 *
 * 1. Create a controlling adminUser via POST /auth/adminUser/join.
 * 2. As that admin, successfully perform an admin-only operation by creating a
 *    discussion-board article category.
 * 3. Create a second adminUser (the deletion target) via another join call, using
 *    a separate connection so tokens do not overwrite the controlling admin
 *    session.
 * 4. As the controlling admin (via its dedicated connection), hard delete the
 *    target admin via DELETE
 *    /discussionBoard/adminUser/adminUsers/{adminUserId}.
 * 5. Attempt a second delete on the same id and expect an error, proving the
 *    record is no longer deletable/found.
 * 6. Perform another admin-only category creation to confirm the controlling admin
 *    remains fully functional after deleting the target admin.
 */
export async function test_api_admin_user_hard_delete_success(
  connection: api.IConnection,
) {
  // Use a dedicated connection object for the controlling admin so that its
  // Authorization header is not overwritten when creating the target admin.
  const controllingConnection: api.IConnection = { ...connection };

  // 1. Create controlling admin via join
  const controllingJoinRequest =
    typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const controllingAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(controllingConnection, {
      body: controllingJoinRequest,
    });
  typia.assert(controllingAdmin);

  // 2. Admin-only operation: create an article category as controlling admin
  const firstCategoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      controllingConnection,
      { body: firstCategoryCreateBody },
    );
  typia.assert(firstCategory);

  // 3. Create target admin to be deleted, using a separate connection so that
  //    the controlling admin's Authorization token remains intact.
  const targetConnection: api.IConnection = { ...connection };
  const targetJoinRequest =
    typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const targetAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(targetConnection, {
      body: targetJoinRequest,
    });
  typia.assert(targetAdmin);

  // Sanity check: controlling admin and target admin must be different users.
  TestValidator.notEquals(
    "controlling admin and target admin must have different ids",
    controllingAdmin.id,
    targetAdmin.id,
  );

  // 4. Hard delete the target admin as the controlling admin
  await api.functional.discussionBoard.adminUser.adminUsers.erase(
    controllingConnection,
    {
      adminUserId: targetAdmin.id,
    },
  );

  // 5. Second delete should fail (target already deleted)
  await TestValidator.error(
    "second deletion of the same adminUserId should result in error",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.erase(
        controllingConnection,
        { adminUserId: targetAdmin.id },
      );
    },
  );

  // 6. Controlling admin still can perform admin-only operations after deletion
  const secondCategoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();
  const secondCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      controllingConnection,
      { body: secondCategoryCreateBody },
    );
  typia.assert(secondCategory);

  TestValidator.notEquals(
    "distinct categories should have different ids",
    firstCategory.id,
    secondCategory.id,
  );
}
