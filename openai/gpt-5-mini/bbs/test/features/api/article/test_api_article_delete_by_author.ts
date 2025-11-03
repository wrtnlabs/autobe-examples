import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate that an authenticated article author can soft-delete their own
 * article.
 *
 * Business context:
 *
 * - An authenticated discussion board member (author) creates an article.
 * - The author issues a delete request for their article which should perform a
 *   soft-delete (server responds with 204 and the article is removed from
 *   public listings).
 *
 * Implementation notes (adapted to available SDK functions):
 *
 * - Because a public GET endpoint for articles is not available in the provided
 *   SDK, this test verifies deletion by asserting the delete succeeds and that
 *   a subsequent delete attempt for the same article throws an error
 *   (idempotent behavior / resource not found), which demonstrates the article
 *   is no longer available.
 *
 * Steps:
 *
 * 1. Register a new member (author) via POST /auth/member/join.
 * 2. Create an article as that member via POST /discussionBoard/member/articles.
 * 3. Delete the article via DELETE /discussionBoard/member/articles/:articleId.
 * 4. Attempt to delete the same article again and expect an error.
 */
export async function test_api_article_delete_by_author(
  connection: api.IConnection,
) {
  // 1) Register a new member (author)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    href: "https://example.com/",
    referrer: "https://example.com/",
    display_name: RandomGenerator.name(),
    ip: null,
  } satisfies IDiscussionBoardMember.IJoin;

  const authorized: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create an article as the authenticated member
  const articleRequest = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleRequest,
    });
  typia.assert(article);

  // Validate that returned article has the expected title
  TestValidator.equals(
    "created article title matches",
    article.title,
    articleRequest.title,
  );

  // 3) Delete the article (expected to succeed)
  await api.functional.discussionBoard.member.articles.erase(connection, {
    articleId: article.id,
  });

  // 4) Subsequent delete should fail (article no longer available / idempotent)
  await TestValidator.error(
    "deleted article cannot be deleted again",
    async () => {
      await api.functional.discussionBoard.member.articles.erase(connection, {
        articleId: article.id,
      });
    },
  );
}
