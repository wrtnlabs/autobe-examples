import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test moderator article creation with comprehensive metadata including
 * multiple categories, maximum allowed tags (5), summary, and validation of all
 * field length constraints.
 *
 * This test validates the complete article creation workflow for moderators:
 *
 * 1. Moderator registration and authentication
 * 2. Category creation (testing multi-category support)
 * 3. Tag creation (testing maximum tag limit of 5)
 * 4. Article creation with all metadata fields populated
 * 5. Validation of field length constraints and metadata integrity
 *
 * The test ensures that moderators can create fully-featured articles utilizing
 * all available organizational and descriptive features for optimal content
 * discoverability and classification.
 */
export async function test_api_moderator_article_with_comprehensive_metadata(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category
  const category1: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category1);

  // Step 3: Create second category for multi-category testing
  const category2: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 10,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category2);

  // Step 4: Create 5 tags (maximum allowed per article)
  const createdTags: IDiscussionBoardTag[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const tag: IDiscussionBoardTag =
        await api.functional.discussionBoard.moderator.tags.create(connection, {
          body: {
            name: RandomGenerator.alphaNumeric(10),
          } satisfies IDiscussionBoardTag.ICreate,
        });
      typia.assert(tag);
      return tag;
    },
  );

  // Step 5: Create article with comprehensive metadata
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 10,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  const articleSummary = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 4,
    wordMax: 6,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        summary: articleSummary,
        category_ids: [category1.id, category2.id],
        tag_ids: createdTags.map((tag) => tag.id),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 6: Validate article metadata
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals("article body matches", article.body, articleBody);
  TestValidator.equals(
    "article summary matches",
    article.summary,
    articleSummary,
  );
  TestValidator.equals(
    "article has 2 categories",
    article.categories.length,
    2,
  );
  TestValidator.equals("article has 5 tags", article.tags.length, 5);
  TestValidator.predicate(
    "article status is published",
    article.status === "published",
  );
  TestValidator.predicate("article view count is 0", article.view_count === 0);
  TestValidator.predicate(
    "article comment count is 0",
    article.comment_count === 0,
  );

  // Validate category IDs match
  const categoryIds = article.categories.map((c) => c.id).sort();
  const expectedCategoryIds = [category1.id, category2.id].sort();
  TestValidator.equals("category IDs match", categoryIds, expectedCategoryIds);

  // Validate tag IDs match
  const tagIds = article.tags.map((t) => t.id).sort();
  const expectedTagIds = createdTags.map((t) => t.id).sort();
  TestValidator.equals("tag IDs match", tagIds, expectedTagIds);

  // Validate title length constraint (5-200 characters)
  TestValidator.predicate(
    "title length is within valid range",
    article.title.length >= 5 && article.title.length <= 200,
  );

  // Validate body length constraint (20-50,000 characters)
  TestValidator.predicate(
    "body length is within valid range",
    article.body.length >= 20 && article.body.length <= 50000,
  );

  // Validate summary length constraint (max 500 characters)
  if (article.summary) {
    TestValidator.predicate(
      "summary length is within valid range",
      article.summary.length <= 500,
    );
  }
}
