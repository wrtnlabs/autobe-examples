import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article update validation against content length business rules.
 *
 * This test validates that the article update endpoint properly enforces
 * content length constraints. It creates a member account, registers with valid
 * credentials, creates an article with valid content, and then attempts to
 * update the article with various invalid content lengths to verify that the
 * system rejects updates that violate title (3-200 chars) and content (10-50000
 * chars) length requirements.
 *
 * Steps:
 *
 * 1. Register a new member account with email and password
 * 2. Create an article with valid title and content
 * 3. Attempt to update article with title < 3 characters (should fail)
 * 4. Attempt to update article with title > 200 characters (should fail)
 * 5. Attempt to update article with content < 10 characters (should fail)
 * 6. Attempt to update article with content > 50000 characters (should fail)
 * 7. Verify error messages indicate field-specific validation failures
 */
export async function test_api_article_update_validation_content_requirements(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPass123"; // Must be 8+ chars with uppercase, lowercase, number

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(authorizedMember);

  // Step 2: Create an article with valid content
  const validArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Valid Article Title", // 3-200 characters
        content: "This is valid article content with enough characters.", // 10-50000 characters
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(validArticle);
  TestValidator.equals(
    "article created successfully",
    validArticle.title,
    "Valid Article Title",
  );

  // Step 3: Attempt to update article with title < 3 characters
  await TestValidator.error(
    "should reject title below 3 characters",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: validArticle.id,
        body: {
          title: "ab", // Only 2 characters, violates minimum
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 4: Attempt to update article with title > 200 characters
  const longTitle =
    RandomGenerator.paragraph({ sentences: 40, wordMin: 4, wordMax: 7 }) +
    " " +
    RandomGenerator.paragraph({ sentences: 40, wordMin: 4, wordMax: 7 });
  await TestValidator.error(
    "should reject title exceeding 200 characters",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: validArticle.id,
        body: {
          title: longTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 5: Attempt to update article with content < 10 characters
  await TestValidator.error(
    "should reject content below 10 characters",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: validArticle.id,
        body: {
          content: "short", // Only 5 characters, violates minimum
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 6: Attempt to update article with content > 50000 characters
  const excessiveContent =
    RandomGenerator.content({
      paragraphs: 150,
      sentenceMin: 50,
      sentenceMax: 100,
      wordMin: 5,
      wordMax: 10,
    }) +
    " " +
    RandomGenerator.content({
      paragraphs: 150,
      sentenceMin: 50,
      sentenceMax: 100,
      wordMin: 5,
      wordMax: 10,
    });
  await TestValidator.error(
    "should reject content exceeding 50000 characters",
    async () => {
      await api.functional.discussionBoard.member.articles.update(connection, {
        articleId: validArticle.id,
        body: {
          content: excessiveContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      });
    },
  );

  // Step 7: Verify that a valid update still succeeds after failed attempts
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: validArticle.id,
      body: {
        title: "Updated Valid Title",
        content:
          "This is an updated article content with valid length requirements.",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);
  TestValidator.equals(
    "article title updated successfully",
    updatedArticle.title,
    "Updated Valid Title",
  );
}
