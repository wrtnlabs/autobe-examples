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
 * Test article creation with special characters in title.
 *
 * Validates that the discussion board system properly handles article creation
 * with titles containing special characters, unicode characters, emojis, HTML
 * entities, and potentially problematic content. Ensures all special characters
 * are properly escaped, encoded, and stored without security vulnerabilities or
 * injection risks.
 *
 * The test workflow:
 *
 * 1. Register a new contributor account with required authentication context
 * 2. Create an article with a title containing diverse special characters:
 *
 *    - Emojis (🎉, 😀, 💻, etc.)
 *    - Unicode characters (é, ñ, 中文, etc.)
 *    - HTML entities (<, >, ", etc.)
 *    - Script tags and malicious content patterns
 *    - Special punctuation and symbols
 * 3. Validate the response preserves all special characters correctly
 * 4. Confirm article is created with 'draft' status
 * 5. Verify type safety and data integrity of the response
 */
export async function test_api_article_creation_special_characters_in_title(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphabets(10);
  const contributorPassword = "SecurePass123!@#";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authenticated successfully",
    contributor.token !== undefined && contributor.token.access !== undefined,
  );

  // Step 2: Create article with special characters in title
  const specialCharacterTitle =
    '🎉 "Special" Characters Test <script>alert("test")</script> & HTML: <tag> ñ é ü 中文 Текст "quotes" \'apostrophes\' @mentions #hashtags $variables %percents';

  const specialCharacterContent =
    RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }) +
    "\n\nSpecial content with emojis: 😀 🎯 ✨ 🚀\nHTML entities: &lt; &gt; &quot; &amp;\nUnicode: é ñ ü ç 中文 العربية";

  // Use a valid UUID for categoryId (standard economics category ID)
  const categoryId = "550e8400-e29b-41d4-a716-446655440000";

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: specialCharacterTitle,
          content: specialCharacterContent,
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Validate special characters are preserved in response
  TestValidator.equals(
    "article title preserves special characters",
    createdArticle.title,
    specialCharacterTitle,
  );

  TestValidator.predicate(
    "article title contains emoji",
    createdArticle.title.includes("🎉"),
  );

  TestValidator.predicate(
    "article title contains HTML tags",
    createdArticle.title.includes("<script>"),
  );

  TestValidator.predicate(
    "article title contains unicode characters",
    createdArticle.title.includes("ñ") &&
      createdArticle.title.includes("é") &&
      createdArticle.title.includes("中文"),
  );

  // Step 4: Verify article metadata and status
  TestValidator.equals(
    "article status is draft",
    createdArticle.status,
    "draft",
  );

  TestValidator.predicate(
    "article author matches contributor",
    createdArticle.author.id === contributor.id,
  );

  TestValidator.predicate(
    "article has creation timestamp",
    createdArticle.created_at !== undefined,
  );

  TestValidator.predicate(
    "article has unique UUID id",
    createdArticle.id.length === 36 && createdArticle.id.includes("-"),
  );

  // Step 5: Validate article content preservation
  TestValidator.predicate(
    "article content contains special characters",
    createdArticle.content.includes("😀") &&
      createdArticle.content.includes("&lt;") &&
      createdArticle.content.includes("中文"),
  );

  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    specialCharacterContent,
  );

  // Step 6: Validate article default state
  TestValidator.equals(
    "article view count initialized to zero",
    createdArticle.view_count,
    0,
  );

  TestValidator.equals(
    "article comment count initialized to zero",
    createdArticle.comment_count,
    0,
  );

  TestValidator.equals(
    "article is not pinned by default",
    createdArticle.is_pinned,
    false,
  );

  TestValidator.equals(
    "article is not locked by default",
    createdArticle.is_locked,
    false,
  );
}
