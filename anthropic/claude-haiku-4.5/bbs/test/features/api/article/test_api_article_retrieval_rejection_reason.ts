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
 * Test article retrieval with rejection_reason field validation.
 *
 * This test validates that the rejection_reason field is properly accessible
 * when retrieving articles from the API. The test verifies that
 * rejection_reason is correctly typed, respects its 500 character maximum
 * constraint, and is properly included in the article response structure for
 * visibility to authors.
 *
 * Test flow:
 *
 * 1. Create a contributor account and authenticate
 * 2. Create a new article in draft status
 * 3. Retrieve the article and verify rejection_reason field structure
 * 4. Validate rejection_reason field type and constraints
 * 5. Verify rejection_reason is null for non-rejected articles
 * 6. Ensure rejection_reason field will properly display moderator feedback
 */
export async function test_api_article_retrieval_rejection_reason(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorData = {
    email: contributorEmail,
    username: RandomGenerator.alphaNumeric(10),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const authenticatedContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: contributorData,
    },
  );
  typia.assert(authenticatedContributor);

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const articleData = {
    title: "Article Title for Rejection Reason Testing",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    categoryId: categoryId,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Retrieve the article and verify rejection_reason field
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(retrievedArticle);

  // Step 4: Verify rejection_reason field exists in response
  TestValidator.predicate(
    "article response includes rejection_reason field",
    "rejection_reason" in retrievedArticle,
  );

  // Step 5: Verify rejection_reason is null or string type
  TestValidator.predicate(
    "rejection_reason field is properly typed",
    retrievedArticle.rejection_reason === null ||
      retrievedArticle.rejection_reason === undefined ||
      typeof retrievedArticle.rejection_reason === "string",
  );

  // Step 6: For draft articles, rejection_reason should be null
  TestValidator.predicate(
    "draft article has null rejection_reason",
    retrievedArticle.status === "draft" &&
      (retrievedArticle.rejection_reason === null ||
        retrievedArticle.rejection_reason === undefined),
  );

  // Step 7: Verify rejection_reason constraint (max 500 characters)
  if (
    retrievedArticle.rejection_reason !== null &&
    retrievedArticle.rejection_reason !== undefined
  ) {
    TestValidator.predicate(
      "rejection_reason respects maximum 500 character limit",
      retrievedArticle.rejection_reason.length <= 500,
    );
  }

  // Step 8: Verify article author can view their own article
  TestValidator.predicate(
    "article author information is present for visibility",
    retrievedArticle.author !== null &&
      retrievedArticle.author !== undefined &&
      "id" in retrievedArticle.author &&
      "username" in retrievedArticle.author,
  );

  // Step 9: Verify article timestamps support revision tracking
  TestValidator.predicate(
    "article has created_at timestamp",
    retrievedArticle.created_at !== null &&
      retrievedArticle.created_at !== undefined,
  );

  TestValidator.predicate(
    "article has updated_at timestamp",
    retrievedArticle.updated_at !== null &&
      retrievedArticle.updated_at !== undefined,
  );

  // Step 10: Create a second article to verify consistent rejection_reason handling
  const secondArticleData = {
    title: "Second Article for Field Validation",
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    categoryId: categoryId,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const secondArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: secondArticleData,
      },
    );
  typia.assert(secondArticle);

  // Step 11: Retrieve second article and verify consistent rejection_reason handling
  const retrievedSecondArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: secondArticle.id,
    });
  typia.assert(retrievedSecondArticle);

  TestValidator.predicate(
    "second article also has rejection_reason field",
    "rejection_reason" in retrievedSecondArticle,
  );

  TestValidator.predicate(
    "rejection_reason is consistent across articles",
    retrievedSecondArticle.rejection_reason === null ||
      retrievedSecondArticle.rejection_reason === undefined ||
      (typeof retrievedSecondArticle.rejection_reason === "string" &&
        retrievedSecondArticle.rejection_reason.length <= 500),
  );
}
