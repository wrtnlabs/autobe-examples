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
 * Validates the response structure of article creation endpoint.
 *
 * This test ensures that when a contributor creates a new article, the API
 * response includes all required fields with correct types and initializes
 * optional fields appropriately. The article is created in draft status and
 * should have no moderation data, no attachments, and counters set to zero.
 *
 * Test flow:
 *
 * 1. Register and authenticate a contributor account
 * 2. Create a new article with title, content, and category
 * 3. Validate response structure:
 *
 *    - All required fields present with correct types
 *    - Status is 'draft'
 *    - View_count and comment_count are 0
 *    - Is_pinned and is_locked are false
 *    - Optional moderation fields are null or undefined
 *    - Attachments array is empty or undefined
 */
export async function test_api_article_creation_response_structure(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPass@123",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Generate article creation data
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create article in draft status
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
          ip: "127.0.0.1",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Validate response structure - required fields
  TestValidator.predicate(
    "article has valid UUID id",
    typeof article.id === "string" && article.id.length === 36,
  );
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
  TestValidator.equals("article status is draft", article.status, "draft");

  // Step 5: Validate author information
  TestValidator.predicate(
    "author has id",
    typeof article.author.id === "string",
  );
  TestValidator.predicate(
    "author has username",
    typeof article.author.username === "string",
  );
  TestValidator.equals(
    "author username matches contributor",
    article.author.username,
    contributor.username,
  );

  // Step 6: Validate category information
  TestValidator.predicate(
    "category has id",
    typeof article.category.id === "string",
  );
  TestValidator.predicate(
    "category has name",
    typeof article.category.name === "string",
  );
  TestValidator.equals(
    "category id matches input",
    article.category.id,
    categoryId,
  );

  // Step 7: Validate timestamps
  TestValidator.predicate(
    "created_at is string",
    typeof article.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof article.updated_at === "string",
  );

  // Step 8: Validate counters and flags
  TestValidator.equals("view count is zero", article.view_count, 0);
  TestValidator.equals("comment count is zero", article.comment_count, 0);
  TestValidator.equals("is_pinned is false", article.is_pinned, false);
  TestValidator.equals("is_locked is false", article.is_locked, false);

  // Step 9: Validate optional fields are null/undefined
  TestValidator.predicate(
    "approvedByModerator is not set",
    article.approvedByModerator === null ||
      article.approvedByModerator === undefined,
  );
  TestValidator.predicate(
    "lastEditedByContributor is not set",
    article.lastEditedByContributor === null ||
      article.lastEditedByContributor === undefined,
  );
  TestValidator.predicate(
    "published_at is not set",
    article.published_at === null || article.published_at === undefined,
  );
  TestValidator.predicate(
    "deleted_at is not set",
    article.deleted_at === null || article.deleted_at === undefined,
  );
  TestValidator.predicate(
    "approval_notes is not set",
    article.approval_notes === null || article.approval_notes === undefined,
  );
  TestValidator.predicate(
    "rejection_reason is not set",
    article.rejection_reason === null || article.rejection_reason === undefined,
  );

  // Step 10: Validate attachments array
  TestValidator.predicate(
    "attachments is empty or undefined",
    !article.attachments || article.attachments.length === 0,
  );
}
