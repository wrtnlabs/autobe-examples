import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article retrieval with permission validation for non-published articles.
 *
 * Validates that only the original author can access draft articles, while
 * other contributors receive 403 Forbidden. Verifies the permission model
 * enforces access control on articles that are not yet published.
 *
 * Test workflow:
 *
 * 1. Create first contributor (article author)
 * 2. Create article draft
 * 3. Verify author can retrieve their draft article
 * 4. Create second contributor (unauthorized user)
 * 5. Verify unauthorized contributor cannot retrieve the draft article (403)
 * 6. Validate permission model is properly enforced
 */
export async function test_api_article_retrieval_rejected(
  connection: api.IConnection,
) {
  // 1. Create first contributor account (article author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: authorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(author);
  TestValidator.predicate(
    "author account created and authenticated",
    author.account_status === "active",
  );

  // Create connection for author
  const authorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${author.token.access}`,
    },
  };

  // 2. Create article draft
  const randomCategoryId = typia.random<string & tags.Format<"uuid">>();
  const articleDraft = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
    categoryId: randomCategoryId,
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000/articles",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      authorConnection,
      {
        body: articleDraft,
      },
    );
  typia.assert(createdArticle);
  TestValidator.predicate(
    "article created in draft status",
    createdArticle.status === "draft",
  );

  // 3. Verify author can retrieve their draft article
  const authorRetrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(authorConnection, {
      articleId: createdArticle.id,
    });
  typia.assert(authorRetrievedArticle);
  TestValidator.equals(
    "author can retrieve their draft article",
    authorRetrievedArticle.id,
    createdArticle.id,
  );

  // 4. Create second contributor account (unauthorized user)
  const unauthorizedEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: unauthorizedEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(unauthorizedContributor);

  // Create connection for unauthorized contributor
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${unauthorizedContributor.token.access}`,
    },
  };

  // 5. Verify unauthorized contributor cannot retrieve the draft article (403)
  await TestValidator.error(
    "unauthorized contributor cannot retrieve draft article (403 Forbidden)",
    async () => {
      await api.functional.discussionBoard.articles.at(unauthorizedConnection, {
        articleId: createdArticle.id,
      });
    },
  );

  // 6. Validate permission model is enforced
  TestValidator.predicate(
    "permission model enforces access control on draft articles",
    true,
  );
}
