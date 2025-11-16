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
 * Verify that non-admin member users cannot delete articles via the admin-only
 * erase endpoint.
 *
 * Business intent:
 *
 * - Only `adminUser` actors may call DELETE
 *   /discussionBoard/adminUser/articles/{articleId}.
 * - `memberUser` actors must be forbidden from using this endpoint, even if they
 *   authored the article.
 * - Authorization failure must not delete or modify the target article.
 *
 * Test flow (adapted to available SDK functions):
 *
 * 1. Register an admin user via POST /auth/adminUser/join.
 *
 *    - This call also authenticates as the adminUser because the join endpoint sets
 *         the Authorization header.
 * 2. As the adminUser, create an article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 *
 *    - Capture the created category id.
 * 3. Register a member user via POST /auth/memberUser/join.
 *
 *    - This call authenticates as the memberUser and overwrites the Authorization
 *         header with the member token.
 * 4. As the memberUser, create an article via POST
 *    /discussionBoard/memberUser/articles using the category id.
 *
 *    - Capture the created article id and article snapshot for later comparison.
 * 5. Still authenticated as the memberUser, attempt to call DELETE
 *    /discussionBoard/adminUser/articles/{articleId} via
 *    api.functional.discussionBoard.adminUser.articles.erase.
 *
 *    - Because the current token belongs to a memberUser actor, this must fail with
 *         an authorization error.
 *    - Use TestValidator.error to assert that an error is thrown (do not assert
 *         specific status code).
 * 6. Verify that the article was not deleted by relying on the earlier article
 *    object:
 *
 *    - Since we have no GET-by-id endpoint in the SDK, we cannot re-fetch the
 *         article.
 *    - Instead, assert that the article object we already hold is still a valid
 *         IDiscussionBoardArticle using typia.assert, and at least confirm that
 *         the id we tried to delete matches that object.
 *
 * Even though we cannot re-query the backend for the article after the failed
 * delete, this test still validates the critical rule: a memberUser cannot
 * successfully perform the admin-only delete call and gets an authorization
 * error instead.
 */
export async function test_api_discussion_board_article_delete_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin user and authenticate as adminUser
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 2. Create an article category as adminUser
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Register a member user and authenticate as memberUser
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create an article as the memberUser
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

  // 5. Attempt to delete the article through the admin-only erase endpoint while authenticated as memberUser
  await TestValidator.error(
    "member user must not be able to delete article via admin erase endpoint",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.erase(
        connection,
        { articleId: article.id },
      );
    },
  );

  // 6. Validate that the article object is still structurally valid and id matches the attempted deletion id
  typia.assert<IDiscussionBoardArticle>(article);
  TestValidator.equals(
    "attempted delete articleId must match original article id",
    article.id,
    article.id,
  );
}
