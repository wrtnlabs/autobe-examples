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
 * Test that author information is correctly populated in article response.
 *
 * This test validates article author attribution by:
 *
 * 1. Creating a contributor account through authentication
 * 2. Creating an article as the authenticated contributor
 * 3. Retrieving the article and verifying author information
 * 4. Ensuring the author field contains the contributor's id and username
 * 5. Confirming the author matches the authenticated contributor
 * 6. Validating that author information enables proper user identification
 */
export async function test_api_article_retrieval_author_information(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorResponse: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!@",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributorResponse);

  const contributorId = contributorResponse.id;
  const contributorUsername = contributorResponse.username;

  // Step 2: Create an article as the authenticated contributor
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Retrieve the created article
  const retrievedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(retrievedArticle);

  // Step 4: Verify author information in the retrieved article
  TestValidator.predicate(
    "author field exists in article response",
    retrievedArticle.author !== null && retrievedArticle.author !== undefined,
  );

  // Step 5: Verify author id matches the authenticated contributor
  TestValidator.equals(
    "author id matches authenticated contributor",
    retrievedArticle.author.id,
    contributorId,
  );

  // Step 6: Verify author username matches the authenticated contributor
  TestValidator.equals(
    "author username matches authenticated contributor",
    retrievedArticle.author.username,
    contributorUsername,
  );

  // Step 7: Verify author information structure is complete
  TestValidator.predicate(
    "author has required id property",
    typeof retrievedArticle.author.id === "string" &&
      retrievedArticle.author.id.length > 0,
  );

  TestValidator.predicate(
    "author has required username property",
    typeof retrievedArticle.author.username === "string" &&
      retrievedArticle.author.username.length > 0,
  );

  // Step 8: Verify author is a summary type with only essential information
  TestValidator.predicate(
    "author information is complete summary",
    Object.keys(retrievedArticle.author).length === 2,
  );
}
