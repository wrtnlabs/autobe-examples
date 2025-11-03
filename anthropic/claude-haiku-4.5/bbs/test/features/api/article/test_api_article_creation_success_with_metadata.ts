import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful article creation with complete metadata.
 *
 * This test validates the complete article creation workflow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Create a new article with title, content, and category selection
 * 3. Validate all metadata fields are properly populated in the response
 * 4. Verify article is immediately accessible and visible
 *
 * The created article should have:
 *
 * - UUID identifier
 * - Author information from the authenticated member
 * - Title and content as provided
 * - Category assignment (Economics or Politics)
 * - View count initialized to 0
 * - Revision number set to 0
 * - Status set to 'published'
 * - Creation and update timestamps in ISO 8601 format
 * - Empty comments and attachments arrays
 */
export async function test_api_article_creation_success_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123";

  const memberAuthResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(memberAuthResponse);

  TestValidator.predicate(
    "member authorized with token",
    memberAuthResponse.token !== undefined &&
      memberAuthResponse.token.access !== undefined,
  );

  // Step 2: Create article with complete metadata
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const categoryCode = RandomGenerator.pick(["economics", "politics"] as const);

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: categoryCode,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 3: Validate article metadata
  TestValidator.predicate(
    "article has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdArticle.id,
    ),
  );

  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    articleContent,
  );

  TestValidator.equals(
    "view count initialized to zero",
    createdArticle.view_count,
    0,
  );

  TestValidator.equals(
    "revision number initialized to zero",
    createdArticle.revision_number,
    0,
  );

  TestValidator.equals(
    "article status is published",
    createdArticle.status,
    "published",
  );

  TestValidator.predicate(
    "author information is present",
    createdArticle.author !== undefined &&
      createdArticle.author.id !== undefined &&
      createdArticle.author.email !== undefined,
  );

  TestValidator.predicate(
    "category information is present",
    createdArticle.category !== undefined &&
      createdArticle.category.code !== undefined,
  );

  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdArticle.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdArticle.updated_at),
  );

  TestValidator.predicate(
    "comments array is empty for new article",
    Array.isArray(createdArticle.comments) &&
      createdArticle.comments.length === 0,
  );

  TestValidator.predicate(
    "attachments array is empty for new article",
    Array.isArray(createdArticle.attachments) &&
      createdArticle.attachments.length === 0,
  );

  TestValidator.predicate(
    "deleted_at is null for published article",
    createdArticle.deleted_at === null ||
      createdArticle.deleted_at === undefined,
  );
}
