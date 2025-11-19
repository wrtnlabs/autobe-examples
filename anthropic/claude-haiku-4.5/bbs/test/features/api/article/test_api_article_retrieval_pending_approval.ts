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
 * Test retrieving draft articles with access control validation.
 *
 * This test validates the article retrieval endpoint's access control logic. It
 * verifies that:
 *
 * 1. An article author can retrieve their own draft article with complete details
 * 2. Other contributors receive 403 Forbidden when attempting to access articles
 *    not owned by them
 * 3. Draft article details are properly returned with all expected fields to
 *    authorized users
 *
 * The test follows a realistic workflow:
 *
 * 1. Create first contributor (article author)
 * 2. Create article in draft status
 * 3. Author retrieves their own draft article - should succeed
 * 4. Create second contributor (unauthorized user)
 * 5. Unauthorized contributor attempts to retrieve author's draft article - should
 *    fail with 403
 */
export async function test_api_article_retrieval_pending_approval(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor (article author)
  const authorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
  };
  const author = await api.functional.auth.contributor.join(connection, {
    body: {
      email: authorCredentials.email,
      username: RandomGenerator.alphabets(8),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(author);
  TestValidator.equals(
    "author account is active",
    author.account_status,
    "active",
  );
  TestValidator.equals(
    "author email verified status",
    author.email_verified,
    false,
  );

  // Step 2: Create article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article initial status is draft",
    article.status,
    "draft",
  );

  // Step 3: Author retrieves their own draft article - should succeed
  const authorRetrievedArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(authorRetrievedArticle);
  TestValidator.equals(
    "author can retrieve their draft article",
    authorRetrievedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "retrieved article status is draft",
    authorRetrievedArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article author matches creator",
    authorRetrievedArticle.author.id,
    author.id,
  );
  TestValidator.equals(
    "article content matches",
    authorRetrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article title matches",
    authorRetrievedArticle.title,
    article.title,
  );

  // Step 4: Create second contributor (unauthorized user)
  const unauthorizedContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(unauthorizedContributor);

  // Step 5: Unauthorized contributor attempts to retrieve author's draft article - should fail with 403
  await TestValidator.error(
    "unauthorized contributor cannot retrieve author's draft article",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: article.id,
      });
    },
  );
}
