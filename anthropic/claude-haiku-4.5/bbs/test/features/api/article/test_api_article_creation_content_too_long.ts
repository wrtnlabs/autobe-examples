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
 * Test article creation with content exceeding maximum length.
 *
 * Validates that the discussion board API properly rejects article submissions
 * when the content field exceeds the 50,000 character maximum limit. This test
 * ensures content validation is enforced at the API boundary.
 *
 * Process:
 *
 * 1. Create and authenticate a contributor account
 * 2. Attempt to create an article with content of 50,001 characters (exceeds
 *    limit)
 * 3. Verify that the API rejects the request with validation error
 * 4. Confirm that validation prevents article creation with oversized content
 */
export async function test_api_article_creation_content_too_long(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace(
            /@[^@]*$/,
            `@test${Math.random().toString(36).substring(7)}.com`,
          ),
        username: RandomGenerator.alphaNumeric(8),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Generate content that exceeds the 50,000 character maximum
  // Create exactly 50,001 characters to exceed the 50,000 limit
  const baseContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  // Pad the content to ensure it exceeds 50,000 characters
  const exceedingContent =
    baseContent + "a".repeat(Math.max(1, 50001 - baseContent.length));

  TestValidator.predicate(
    "content exceeds maximum length of 50,000 characters",
    exceedingContent.length > 50000,
  );

  // Step 3: Attempt to create article with oversized content
  // This should fail content length validation
  await TestValidator.error(
    "article creation should fail with content exceeding 50,000 characters",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.name(3),
            content: exceedingContent,
            categoryId: typia
              .random<string & tags.Format<"uuid">>()
              .toLowerCase(),
            href: "https://example.com/create-article",
            referrer: "https://example.com/articles",
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );
}
