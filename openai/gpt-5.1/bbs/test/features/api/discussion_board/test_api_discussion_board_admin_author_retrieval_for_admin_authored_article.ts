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
import type { IDiscussionBoardArticleOfAdminusersAdminAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleOfAdminusersAdminAuthor";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate retrieval of admin author metadata for a discussion board article.
 *
 * Business context:
 *
 * - Some discussion board articles are authored by administrators. For such
 *   articles, the public-facing API exposes admin author metadata via GET
 *   /discussionBoard/articles/{articleId}/adminAuthor.
 * - The endpoint returns a trimmed DTO,
 *   IDiscussionBoardArticleOfAdminusersAdminAuthor, containing only fields that
 *   are safe and meaningful for public display (id, displayName, roleLabel).
 * - The endpoint itself is read-only and is expected to be publicly accessible,
 *   because admin author labels are typically shown alongside articles for all
 *   visitors.
 *
 * Test workflow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join to establish an
 *    administrative actor and session.
 * 2. As that adminUser, create a new article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Register a memberUser via POST /auth/memberUser/join to represent a
 *    front-facing discussion participant, then keep their authenticated session
 *    active.
 * 4. As the memberUser, create a new discussion article via POST
 *    /discussionBoard/memberUser/articles using the admin-created category so
 *    that a valid articleId exists in discussion_board_articles.
 * 5. Call GET /discussionBoard/articles/{articleId}/adminAuthor using the
 *    articleId from step 4, without performing any manual header handling,
 *    relying on the SDK connection state.
 * 6. Validate that the response is a valid
 *    IDiscussionBoardArticleOfAdminusersAdminAuthor instance via typia.assert,
 *    and perform simple business assertions that displayName and roleLabel are
 *    non-empty strings.
 *
 * Notes and constraints:
 *
 * - The concrete mapping between an article and an admin author is driven by the
 *   internal discussion_board_article_of_adminusers relationship. Because we do
 *   not have an explicit public API to bind an article to a specific admin,
 *   this test focuses on validating the endpoint behavior and DTO shape for a
 *   real articleId but does not try to assert that the admin returned is
 *   exactly the adminUser created in step 1.
 * - The test avoids any negative or error-path scenarios, status-code assertions,
 *   or deliberate type errors. It strictly validates the happy path and type
 *   safety.
 */
export async function test_api_discussion_board_admin_author_retrieval_for_admin_authored_article(
  connection: api.IConnection,
) {
  // 1. AdminUser registration (join) to establish an administrative actor
  const adminJoinRequest =
    typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as the authenticated adminUser
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. MemberUser registration (join) to represent a front-facing user
  const memberJoinRequest =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert(memberAuthorized);

  // 4. Create a discussion article as the memberUser using the category id
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

  // 5. Retrieve admin author information for the created article
  const adminAuthor: IDiscussionBoardArticleOfAdminusersAdminAuthor =
    await api.functional.discussionBoard.articles.adminAuthor.at(connection, {
      articleId: article.id,
    });
  typia.assert(adminAuthor);

  // 6. Business-level assertions on the returned admin author metadata
  TestValidator.predicate(
    "admin author displayName must be a non-empty string",
    typeof adminAuthor.displayName === "string" &&
      adminAuthor.displayName.length > 0,
  );

  TestValidator.predicate(
    "admin author roleLabel must be a non-empty string",
    typeof adminAuthor.roleLabel === "string" &&
      adminAuthor.roleLabel.length > 0,
  );
}
