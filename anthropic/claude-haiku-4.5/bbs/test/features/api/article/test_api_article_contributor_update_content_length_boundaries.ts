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
 * Test content length validation boundaries for article updates.
 *
 * Validates that the API properly enforces content length constraints (minimum
 * 50 characters, maximum 50,000 characters) when updating articles. Tests both
 * boundary conditions (exactly at limits) and edge cases (one character
 * above/below limits) to ensure validation logic is correct.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account
 * 2. Create an initial article with valid content
 * 3. Test updating with content at minimum boundary (exactly 50 chars)
 * 4. Test updating with content at maximum boundary (exactly 50,000 chars)
 * 5. Test updating with content just above minimum (51 chars)
 * 6. Test updating with content just below maximum (49,999 chars)
 * 7. Verify API rejects content below minimum (49 chars)
 * 8. Verify API rejects content above maximum (50,001 chars)
 * 9. Confirm final valid updates are properly stored
 */
export async function test_api_article_contributor_update_content_length_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email:
          typia.random<string & tags.Format<"email">>().split("@").join("-") +
          "@test.local",
        username: `contributor_${RandomGenerator.alphaNumeric(8)}`,
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Helper function to generate content of exact length
  const generateContent = (length: number): string => {
    if (length <= 0) return "";
    const baseChar = "a";
    return baseChar.repeat(length);
  };

  // Fixed category ID for testing (assumes test data includes this category)
  const testCategoryId = "550e8400-e29b-41d4-a716-446655440000";

  // 2. Create an initial article with valid content
  const initialContent = generateContent(100);
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Content Length Boundary Test Article",
          content: initialContent,
          categoryId: testCategoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "initial article created with correct content length",
    article.content.length,
    100,
  );

  // 3. Test minimum boundary: exactly 50 characters
  const minBoundaryContent = generateContent(50);
  const updatedMin: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: minBoundaryContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedMin);
  TestValidator.equals(
    "minimum boundary content accepted at exactly 50 characters",
    updatedMin.content,
    minBoundaryContent,
  );
  TestValidator.equals(
    "minimum boundary length verified",
    updatedMin.content.length,
    50,
  );

  // 4. Test maximum boundary: exactly 50,000 characters
  const maxBoundaryContent = generateContent(50000);
  const updatedMax: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: maxBoundaryContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedMax);
  TestValidator.equals(
    "maximum boundary content accepted at exactly 50,000 characters",
    updatedMax.content.length,
    50000,
  );

  // 5. Test above minimum boundary: 51 characters
  const aboveMinContent = generateContent(51);
  const updatedAboveMin: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: aboveMinContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedAboveMin);
  TestValidator.equals(
    "content above minimum boundary accepted at 51 characters",
    updatedAboveMin.content.length,
    51,
  );

  // 6. Test below maximum boundary: 49,999 characters
  const belowMaxContent = generateContent(49999);
  const updatedBelowMax: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: belowMaxContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedBelowMax);
  TestValidator.equals(
    "content below maximum boundary accepted at 49,999 characters",
    updatedBelowMax.content.length,
    49999,
  );

  // 7. Test rejection: below minimum (49 characters)
  const belowMinContent = generateContent(49);
  await TestValidator.error(
    "content below minimum of 50 characters should be rejected",
    async () => {
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            content: belowMinContent,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // 8. Test rejection: above maximum (50,001 characters)
  const aboveMaxContent = generateContent(50001);
  await TestValidator.error(
    "content above maximum of 50,000 characters should be rejected",
    async () => {
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            content: aboveMaxContent,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // 9. Verify final valid content is properly stored
  const finalContent = generateContent(1000);
  const finalUpdate: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: finalContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals(
    "final content length is correct at 1000 characters",
    finalUpdate.content.length,
    1000,
  );
  TestValidator.equals(
    "final content stored correctly",
    finalUpdate.content,
    finalContent,
  );
}
