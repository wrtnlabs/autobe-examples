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
 * Validates article content validation with various edge cases at boundary
 * conditions.
 *
 * Tests content validation enforcement by attempting to create articles with:
 *
 * - Minimum valid content (exactly 50 characters)
 * - Maximum valid content (exactly 50,000 characters)
 * - Normal range content (various lengths)
 *
 * Confirms that content validation is enforced properly and articles created
 * with valid content are initialized in draft status.
 */
export async function test_api_article_creation_content_validation(
  connection: api.IConnection,
) {
  // 1. Register a new contributor for testing
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!@#",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Get a valid category ID for article creation
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Test: Content at minimum boundary (exactly 50 characters) - should succeed
  const minBoundaryContent = RandomGenerator.alphabets(50);
  const minContentArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: minBoundaryContent,
          categoryId: validCategoryId,
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(minContentArticle);
  TestValidator.equals(
    "minimum boundary article should be created in draft status",
    minContentArticle.status,
    "draft",
  );
  TestValidator.equals(
    "minimum boundary article content should be exactly 50 characters",
    minContentArticle.content.length,
    50,
  );
  TestValidator.equals(
    "minimum boundary article author should match contributor",
    minContentArticle.author.id,
    contributor.id,
  );

  // 4. Test: Content at maximum boundary (exactly 50,000 characters) - should succeed
  const maxBoundaryContent = RandomGenerator.alphabets(50000);
  const maxContentArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: maxBoundaryContent,
          categoryId: validCategoryId,
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(maxContentArticle);
  TestValidator.equals(
    "maximum boundary article should be created in draft status",
    maxContentArticle.status,
    "draft",
  );
  TestValidator.equals(
    "maximum boundary article content should be exactly 50,000 characters",
    maxContentArticle.content.length,
    50000,
  );
  TestValidator.equals(
    "maximum boundary article author should match contributor",
    maxContentArticle.author.id,
    contributor.id,
  );

  // 5. Test: Valid content in normal range - should succeed
  const normalContent = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const validArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          content: normalContent,
          categoryId: validCategoryId,
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(validArticle);
  TestValidator.predicate(
    "normal range article content length should be within 50-50,000 characters",
    validArticle.content.length >= 50 && validArticle.content.length <= 50000,
  );
  TestValidator.equals(
    "normal range article should be in draft status",
    validArticle.status,
    "draft",
  );
  TestValidator.equals(
    "normal range article author should match contributor",
    validArticle.author.id,
    contributor.id,
  );

  // 6. Test: Multiple articles with varying valid content lengths to validate range
  const testLengths = [51, 100, 500, 5000, 25000, 49999];
  for (const length of testLengths) {
    const testContent = RandomGenerator.alphabets(length);
    const testArticle: IDiscussionBoardArticle =
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: testContent,
            categoryId: validCategoryId,
            href: "http://localhost:3000/article/create",
            referrer: "http://localhost:3000",
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(testArticle);
    TestValidator.equals(
      `article with ${length} character content should be successfully created`,
      testArticle.content.length,
      length,
    );
    TestValidator.equals(
      `article with ${length} character content should have draft status`,
      testArticle.status,
      "draft",
    );
    TestValidator.equals(
      `article with ${length} character content should have correct author`,
      testArticle.author.id,
      contributor.id,
    );
  }
}
