import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate safe not-found behavior when admin requests details for a
 * non-existent member user.
 *
 * Business goal
 *
 * - When an administrator calls the member user detail endpoint with a
 *   non-existent memberUserId, the backend must fail safely (not-found style
 *   behavior) without returning any member profile object or leaking which IDs
 *   are valid.
 *
 * Test flow
 *
 * 1. Register an adminUser via /auth/adminUser/join so that we have permissions to
 *    call admin-only memberUsers.at endpoint.
 * 2. With that admin session, create at least one article category via
 *    /discussionBoard/adminUser/articleCategories.create so that the board is
 *    not empty.
 * 3. Register a memberUser via /auth/memberUser/join and, as that member, create
 *    an article via /discussionBoard/memberUser/articles.create so the
 *    environment contains realistic content and we have one known valid member
 *    id that we must _not_ use for the negative case.
 * 4. Generate a random UUID that is different from this existing member id.
 * 5. Re-authenticate as adminUser (to ensure admin context) and invoke
 *    api.functional.discussionBoard.adminUser.memberUsers.at with the
 *    non-existent memberUserId.
 * 6. Use TestValidator.error to assert that the call results in an error and no
 *    IDiscussionBoardMemberuser object is returned. We do not assert a specific
 *    HTTP status code or error body, only that an error occurs for the
 *    non-existent id.
 */
export async function test_api_admin_member_user_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser.join) to gain admin privileges
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Create a member user and let them create an article
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/top",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // Capture the valid member id so we can avoid it for the negative case
  const existingMemberId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 4. Generate a UUID that is different from existingMemberId
  let invalidMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (invalidMemberId === existingMemberId) {
    invalidMemberId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Ensure we are in admin context (re-login as adminUser for clarity)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Call memberUsers.at with a non-existent UUID and expect an error
  await TestValidator.error(
    "admin memberUsers.at should error on non-existent memberUserId",
    async () => {
      await api.functional.discussionBoard.adminUser.memberUsers.at(
        connection,
        {
          memberUserId: invalidMemberId,
        },
      );
    },
  );
}
