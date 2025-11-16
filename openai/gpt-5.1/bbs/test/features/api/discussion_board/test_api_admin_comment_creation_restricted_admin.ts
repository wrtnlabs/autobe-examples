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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate admin comment creation on a member-authored article.
 *
 * Business goal (rewritten from the original restrictive-scenario draft):
 * Ensure that an authenticated admin user can create a comment on an article
 * authored by a member user, wiring together the admin/member auth flows,
 * article category creation, article creation, and comment creation APIs.
 *
 * Steps implemented:
 *
 * 1. Admin joins via /auth/adminUser/join and becomes authenticated.
 * 2. (Optional but explicit) Admin logs in again via /auth/adminUser/login to
 *    demonstrate actor switching is working and tokens are correctly wired.
 * 3. As admin, create an article category via
 *    /discussionBoard/adminUser/articleCategories.create.
 * 4. Member joins via /auth/memberUser/join, switching the connection context to
 *    memberUser.
 * 5. As member, create an article in the created category via
 *    /discussionBoard/memberUser/articles.create; capture article.id.
 * 6. Switch auth context back to the admin via /auth/adminUser/login.
 * 7. As admin, create a comment on the member article via
 *    /discussionBoard/adminUser/articles/{articleId}/comments.create with a
 *    valid IDiscussionBoardComment.ICreate body.
 * 8. Assert that each non-void response matches its DTO using typia.assert, and
 *    verify that the returned comment.article.id equals the article.id.
 *
 * Note: Original scenario mentioned restrictions on admins; current API surface
 * contains no explicit restriction commands or comment listing endpoints, so
 * this test focuses solely on the successful happy path.
 */
export async function test_api_admin_comment_creation_restricted_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (register + initial authenticated context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!", // any string is acceptable; tagged as password in DTO
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Admin logs in again (explicit login flow and token swap)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.equals(
    "admin id from join and login should match",
    adminAuthorizedFromLogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 3. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  TestValidator.equals(
    "created category code should match request",
    category.code,
    categoryBody.code,
  );

  // 4. Member joins (switch authentication context to memberUser)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Member1234!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "192.168.0.10",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 5. As member, create an article in that category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  TestValidator.equals(
    "article.category.id should equal category.id",
    article.category.id,
    category.id,
  );

  // 6. Switch back to admin via login (overwriting Authorization header)
  const adminRelogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  TestValidator.equals(
    "admin id after relogin should still match original admin",
    adminRelogin.id,
    adminAuthorizedFromJoin.id,
  );

  // 7. As admin, create a comment on the member-authored article
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.adminUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 8. Business-level assertions on the created comment
  TestValidator.equals(
    "comment should be attached to the correct article",
    comment.article.id,
    article.id,
  );

  TestValidator.predicate(
    "comment body should match what was sent",
    comment.body === commentBody.body,
  );
}
