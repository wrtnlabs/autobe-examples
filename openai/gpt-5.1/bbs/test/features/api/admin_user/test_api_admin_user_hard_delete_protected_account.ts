import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Ensure that a self/primary admin account cannot be hard-deleted and remains
 * functional.
 *
 * Business goals:
 *
 * - Verify that DELETE /discussionBoard/adminUser/adminUsers/{adminUserId}
 *   rejects attempts to delete the currently authenticated admin (self-deletion
 *   / protected account).
 * - Prove that the admin remains operational after the failed deletion attempt by
 *   successfully executing another privileged operation.
 *
 * Steps:
 *
 * 1. Join a new adminUser via POST /auth/adminUser/join and capture its id.
 * 2. Using the issued admin token, create an article category to prove admin
 *    privileges work.
 * 3. Attempt DELETE /discussionBoard/adminUser/adminUsers/{adminUserId} with the
 *    same admin's id and assert that the call fails.
 * 4. Create another article category afterwards and assert success, demonstrating
 *    that the admin account/session still functions and was not deleted.
 */
export async function test_api_admin_user_hard_delete_protected_account(
  connection: api.IConnection,
) {
  // 1. Register a primary admin user (bootstrap/self account)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Sanity check: admin email echoes back correctly
  TestValidator.equals(
    "joined admin email should match input email",
    admin.email,
    joinBody.email,
  );

  // 2. Create an article category as this admin to confirm privileges
  const firstCategoryBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const firstCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: firstCategoryBody,
      },
    );
  typia.assert(firstCategory);

  TestValidator.equals(
    "first category code should echo request",
    firstCategory.code,
    firstCategoryBody.code,
  );
  TestValidator.equals(
    "first category name should echo request",
    firstCategory.name,
    firstCategoryBody.name,
  );

  // 3. Try to hard delete the same admin account; this should be rejected
  await TestValidator.error(
    "self admin hard delete must be rejected",
    async () => {
      await api.functional.discussionBoard.adminUser.adminUsers.erase(
        connection,
        {
          adminUserId: admin.id,
        },
      );
    },
  );

  // 4. After the failed deletion, verify that the admin is still functional
  //    by creating another category successfully.
  const secondCategoryBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const secondCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: secondCategoryBody,
      },
    );
  typia.assert(secondCategory);

  TestValidator.equals(
    "second category code should echo request after failed delete",
    secondCategory.code,
    secondCategoryBody.code,
  );
  TestValidator.equals(
    "second category name should echo request after failed delete",
    secondCategory.name,
    secondCategoryBody.name,
  );

  TestValidator.predicate(
    "admin performed privileged operations before and after delete attempt",
    firstCategory.id !== undefined && secondCategory.id !== undefined,
  );
}
