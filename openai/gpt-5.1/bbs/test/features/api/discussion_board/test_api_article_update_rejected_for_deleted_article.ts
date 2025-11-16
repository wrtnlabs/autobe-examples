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
 * Validate that member article update is rejected after administrative
 * deletion.
 *
 * Business scenario:
 *
 * - A regular member creates an article under a valid category.
 * - An administrator hard-deletes that article using the admin-only erase API.
 * - The member then attempts to update the previously created article via the
 *   member update endpoint.
 *
 * Expectations:
 *
 * 1. Member join/login and admin join/login succeed and yield valid sessions.
 * 2. Admin can create a valid article category that member can use.
 * 3. Member can successfully create an article in that category.
 * 4. Admin can successfully erase (hard-delete) that article by id.
 * 5. Any subsequent attempt by the member to update that article must fail,
 *    producing an HTTP error (e.g., not-found or deletion-related) rather than
 *    reviving or modifying the deleted resource.
 *
 * Steps:
 *
 * 1. Register member user via /auth/memberUser/join.
 * 2. Register admin user via /auth/adminUser/join.
 * 3. As admin, create article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch to member and create article via /discussionBoard/memberUser/articles.
 * 5. Switch to admin and erase article via
 *    /discussionBoard/adminUser/articles/{articleId}.
 * 6. Switch back to member and attempt to update article via
 *    /discussionBoard/memberUser/articles/{articleId}.
 * 7. Assert that the update call throws an error using TestValidator.error.
 */
export async function test_api_article_update_rejected_for_deleted_article(
  connection: api.IConnection,
) {
  // 1. Register member user (join immediately authenticates and sets token)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://frontend.example.com/join/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user (join authenticates and sets admin token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://frontend.example.com/join/admin",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create a category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 4. Switch to member session via login (overwrites Authorization header)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login/member",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 5. Member creates an article in that category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 6. Switch back to admin session by logging in as admin
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://frontend.example.com/login/admin",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 7. Admin hard-deletes the article
  await api.functional.discussionBoard.adminUser.articles.erase(connection, {
    articleId: article.id,
  });

  // 8. Switch again to member session
  const memberLoginResultAfterDeletion: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResultAfterDeletion);

  // 9. Attempt to update the deleted article and assert that it fails
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    discussion_board_article_category_id: category.id,
  } satisfies IDiscussionBoardArticle.IUpdate;

  await TestValidator.error(
    "member cannot update article after admin hard deletion",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.update(
        connection,
        {
          articleId: article.id,
          body: updateBody,
        },
      );
    },
  );
}
