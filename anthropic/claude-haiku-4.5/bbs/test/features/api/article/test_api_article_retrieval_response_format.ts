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
 * Test complete response structure for article retrieval.
 *
 * This test validates that a published article retrieved from the discussion
 * board contains all expected fields with correct types and proper nesting. It
 * ensures:
 *
 * 1. All required fields are present (id, title, content, status, author,
 *    category, created_at, updated_at, view_count, comment_count, is_pinned,
 *    is_locked)
 * 2. Optional fields are properly null or omitted based on article state
 * 3. Nested objects (author, category, attachments) have correct structure
 * 4. Response format matches IDiscussionBoardArticle schema exactly
 * 5. Type validation passes for all fields using typia.assert()
 *
 * Process:
 *
 * 1. Register a contributor account
 * 2. Create an article in draft status
 * 3. Retrieve the created article and validate complete response structure
 * 4. Verify all required fields are present with correct types
 */
export async function test_api_article_retrieval_response_format(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account for article creation
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(20),
      password: "SecurePass123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article draft
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const createdArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/discussion",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Retrieve the article and validate complete response structure
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(retrievedArticle);

  // Validate response structure and all required fields
  TestValidator.predicate(
    "article has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedArticle.id,
    ),
  );

  TestValidator.predicate(
    "article title is string with correct length",
    typeof retrievedArticle.title === "string" &&
      retrievedArticle.title.length >= 5 &&
      retrievedArticle.title.length <= 200,
  );

  TestValidator.predicate(
    "article content is string with correct length",
    typeof retrievedArticle.content === "string" &&
      retrievedArticle.content.length >= 50 &&
      retrievedArticle.content.length <= 50000,
  );

  TestValidator.predicate(
    "article status is valid",
    [
      "draft",
      "pending_approval",
      "published",
      "rejected",
      "archived",
      "deleted",
    ].includes(retrievedArticle.status),
  );

  TestValidator.predicate(
    "author is present with id and username",
    retrievedArticle.author &&
      typeof retrievedArticle.author.id === "string" &&
      typeof retrievedArticle.author.username === "string",
  );

  TestValidator.predicate(
    "category is present with id and code",
    retrievedArticle.category &&
      typeof retrievedArticle.category.id === "string" &&
      typeof retrievedArticle.category.code === "string",
  );

  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedArticle.created_at),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedArticle.updated_at),
  );

  TestValidator.predicate(
    "view_count is non-negative integer",
    typeof retrievedArticle.view_count === "number" &&
      retrievedArticle.view_count >= 0 &&
      Number.isInteger(retrievedArticle.view_count),
  );

  TestValidator.predicate(
    "comment_count is non-negative integer",
    typeof retrievedArticle.comment_count === "number" &&
      retrievedArticle.comment_count >= 0 &&
      Number.isInteger(retrievedArticle.comment_count),
  );

  TestValidator.predicate(
    "is_pinned is boolean",
    typeof retrievedArticle.is_pinned === "boolean",
  );

  TestValidator.predicate(
    "is_locked is boolean",
    typeof retrievedArticle.is_locked === "boolean",
  );

  TestValidator.predicate(
    "published_at is null or ISO 8601 date-time if present",
    retrievedArticle.published_at === null ||
      retrievedArticle.published_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        retrievedArticle.published_at,
      ),
  );

  TestValidator.predicate(
    "deleted_at is null or ISO 8601 date-time if present",
    retrievedArticle.deleted_at === null ||
      retrievedArticle.deleted_at === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedArticle.deleted_at),
  );

  TestValidator.predicate(
    "approval_notes is null or string if present",
    retrievedArticle.approval_notes === null ||
      retrievedArticle.approval_notes === undefined ||
      typeof retrievedArticle.approval_notes === "string",
  );

  TestValidator.predicate(
    "rejection_reason is null or string if present",
    retrievedArticle.rejection_reason === null ||
      retrievedArticle.rejection_reason === undefined ||
      typeof retrievedArticle.rejection_reason === "string",
  );

  TestValidator.predicate(
    "attachments is array if present",
    retrievedArticle.attachments === undefined ||
      Array.isArray(retrievedArticle.attachments),
  );

  TestValidator.predicate(
    "lastEditedByContributor is null, undefined, or object if present",
    retrievedArticle.lastEditedByContributor === null ||
      retrievedArticle.lastEditedByContributor === undefined ||
      (typeof retrievedArticle.lastEditedByContributor === "object" &&
        typeof retrievedArticle.lastEditedByContributor.id === "string"),
  );

  TestValidator.predicate(
    "approvedByModerator is null, undefined, or object if present",
    retrievedArticle.approvedByModerator === null ||
      retrievedArticle.approvedByModerator === undefined ||
      (typeof retrievedArticle.approvedByModerator === "object" &&
        typeof retrievedArticle.approvedByModerator.id === "string"),
  );

  TestValidator.equals(
    "retrieved article matches created article id",
    retrievedArticle.id,
    createdArticle.id,
  );
}
