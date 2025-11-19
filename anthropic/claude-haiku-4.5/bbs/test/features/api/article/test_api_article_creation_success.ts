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
 * Test successful article creation by authenticated contributor.
 *
 * Verifies the complete workflow for creating an article in the discussion
 * board:
 *
 * 1. Contributor registers and authenticates with valid credentials
 * 2. Contributor creates a new article with title, content, and category
 * 3. Article is created in draft status with correct metadata
 * 4. Response includes full article details with author information
 * 5. Counters (view_count, comment_count) are properly initialized
 * 6. Moderation flags (is_pinned, is_locked) are properly initialized
 *
 * This test validates that authenticated contributors can successfully create
 * article drafts and that the system properly initializes all article metadata
 * and audit fields.
 */
export async function test_api_article_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor email verified",
    !contributor.email_verified,
  );
  TestValidator.predicate(
    "contributor account is active",
    contributor.account_status === "active",
  );

  // Step 2: Create an article with valid data
  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 3,
    wordMax: 7,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Verify article has correct status and metadata
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article category id matches input",
    article.category.id,
    categoryId,
  );

  // Step 4: Verify author information
  TestValidator.equals(
    "article author id matches contributor",
    article.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "article author username matches contributor",
    article.author.username,
    contributor.username,
  );

  // Step 5: Verify counters are initialized
  TestValidator.equals("view count initialized to 0", article.view_count, 0);
  TestValidator.equals(
    "comment count initialized to 0",
    article.comment_count,
    0,
  );

  // Step 6: Verify moderation flags are initialized
  TestValidator.equals(
    "is_pinned initialized to false",
    article.is_pinned,
    false,
  );
  TestValidator.equals(
    "is_locked initialized to false",
    article.is_locked,
    false,
  );

  // Step 7: Verify timestamps exist
  TestValidator.predicate(
    "created_at is valid timestamp",
    article.created_at !== null && article.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    article.updated_at !== null && article.updated_at !== undefined,
  );

  // Step 8: Verify approver is null for draft status
  TestValidator.predicate(
    "approvedByModerator is null for draft",
    article.approvedByModerator === null ||
      article.approvedByModerator === undefined,
  );
}
