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
 * Validate that requesting article detail with a non-existent articleId
 * produces an error while leaving existing data intact.
 *
 * Business context:
 *
 * - The discussion board exposes GET /discussionBoard/articles/{articleId} to
 *   retrieve a full article record by UUID primary key.
 * - Not-found behavior must be robust even when the system has valid categories
 *   and articles; the error must not depend on an empty database.
 * - Error responses must not affect existing articles or categories.
 *
 * Scenario steps:
 *
 * 1. Admin user joins (registration) to obtain adminUser authentication.
 * 2. As adminUser, create a valid article category.
 * 3. Member user joins (registration) to obtain memberUser authentication.
 * 4. As memberUser, create a valid article belonging to the created category to
 *    ensure the articles table is not empty.
 * 5. Generate a random UUID that is different from the created article's id and
 *    use it as a non-existent articleId.
 * 6. Call GET /discussionBoard/articles/{articleId} with this unknown id and
 *    validate that the API responds with an error using TestValidator.error,
 *    without asserting specific HTTP status codes.
 * 7. Re-fetch the real article by its true id and assert it is still accessible
 *    and structurally valid, proving no side effects.
 */
export async function test_api_discussion_board_article_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Admin user joins (registration)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Adm1n+" + RandomGenerator.alphaNumeric(8),
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

  // 2. As adminUser, create a valid article category
  const categoryBody = {
    code: "CAT-" + RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Member user joins (registration)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Mem1+" + RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create a valid article under the created category
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

  // 5. Generate a non-existent articleId (UUID different from created one)
  let unknownArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownArticleId === article.id) {
    unknownArticleId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "unknown articleId must differ from existing article id",
    unknownArticleId,
    article.id,
  );

  // 6. Call GET /discussionBoard/articles/{articleId} with unknown id
  await TestValidator.error(
    "requesting non-existent article should yield an error",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: unknownArticleId,
      });
    },
  );

  // 7. Confirm existing article remains accessible and unchanged
  const fetched: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "existing article remains accessible after not-found request",
    fetched.id,
    article.id,
  );
  TestValidator.equals(
    "existing article category remains consistent",
    fetched.category.id,
    category.id,
  );
}
