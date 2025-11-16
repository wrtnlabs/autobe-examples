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
 * Ensure that an admin can delete a discussion board article and that the
 * deletion is effective.
 *
 * Business context:
 *
 * - Articles are created by authenticated member users under specific categories
 *   that are managed by admin users.
 * - Admins have privileged access to delete articles via the
 *   `/discussionBoard/adminUser/articles/{articleId}` endpoint.
 * - When a delete succeeds, the target row in `discussion_board_articles` should
 *   be gone so that subsequent delete attempts for the same `articleId` fail.
 *
 * This E2E test performs the following workflow:
 *
 * 1. Register an admin user (join) and establish an admin authentication context.
 * 2. As the admin, create an article category that articles can belong to.
 * 3. Register a member user (join) and switch authentication context to the
 *    member.
 * 4. As the member, create an article in the created category and capture its
 *    `id`.
 * 5. Switch authentication context back to the admin user (login).
 * 6. As the admin, delete the article using `erase` with the captured `articleId`.
 * 7. Attempt to delete the same article again and assert that an error is thrown,
 *    proving that the article has already been removed.
 *
 * Note:
 *
 * - The original scenario mentioned validating cascades for comments,
 *   attachments, and reports. Because the corresponding APIs are not exposed in
 *   the provided SDK list, this test focuses on verifying that the article
 *   itself is deleted and that repeat deletion operations fail.
 */
export async function test_api_discussion_board_article_delete_cascades_related_entities(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join) and establish admin authentication.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Adm1n!Passw0rd#", // satisfies tags.Format<"password">
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. As the admin, create an article category.
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  TestValidator.predicate(
    "created category should have same code as request",
    category.code === categoryBody.code,
  );

  // 3. Register a member user (join) and switch authentication context.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  TestValidator.predicate(
    "member email in session should match join request",
    memberAuthorizedFromJoin.email === memberJoinBody.email,
  );

  // 4. As the member, create an article under the created category.
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

  TestValidator.predicate(
    "article category id should match created category",
    article.category.id === category.id,
  );

  // 5. Switch authentication context back to admin via login.
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  TestValidator.predicate(
    "admin id from login should match id from join",
    adminAuthorizedFromLogin.id === adminAuthorizedFromJoin.id,
  );

  // 6. As the admin, delete the article using its id.
  await api.functional.discussionBoard.adminUser.articles.erase(connection, {
    articleId: article.id,
  });

  // 7. Verify that attempting to delete the same article again fails.
  await TestValidator.error(
    "second deletion of the same article should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
