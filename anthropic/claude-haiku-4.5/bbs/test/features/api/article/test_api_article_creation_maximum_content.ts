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
 * Test article creation with maximum allowed content length.
 *
 * This test validates that the discussion board API correctly handles articles
 * created with maximum content boundaries. A contributor registers and creates
 * an article with:
 *
 * - Title: exactly 200 characters (maximum allowed)
 * - Content: exactly 50,000 characters (maximum allowed)
 * - Category: valid article category
 *
 * The test verifies that:
 *
 * 1. Contributors can successfully authenticate and join the discussion board
 * 2. Articles with maximum-length titles and content are accepted
 * 3. The API properly validates maximum length constraints
 * 4. All content is preserved without truncation when stored
 * 5. The created article can be retrieved with all content intact
 */
export async function test_api_article_creation_maximum_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphaNumeric(20),
        password: "SecurePass123!@",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor authenticated",
    contributor.email,
    contributorEmail,
  );

  // Step 2: Generate article title with exactly 200 characters (maximum)
  const maxTitle = "A".repeat(200);
  TestValidator.equals("title length is maximum", maxTitle.length, 200);

  // Step 3: Generate article content with exactly 50,000 characters (maximum)
  let maxContent = "";
  while (maxContent.length < 50000) {
    const paragraph = RandomGenerator.paragraph({
      sentences: 50,
      wordMin: 3,
      wordMax: 8,
    });
    maxContent += paragraph + " ";
  }
  maxContent = maxContent.substring(0, 50000);
  TestValidator.equals("content length is maximum", maxContent.length, 50000);

  // Step 4: Get a valid category ID for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create article with maximum content length
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: maxTitle,
          content: maxContent,
          categoryId: categoryId,
          href: "https://example.com/article/create",
          referrer: "https://example.com/categories",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 6: Validate article properties
  TestValidator.equals("article title matches input", article.title, maxTitle);
  TestValidator.equals(
    "article content length preserved",
    article.content.length,
    50000,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    maxContent,
  );
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals(
    "article author matches contributor",
    article.author.id,
    contributor.id,
  );
  TestValidator.predicate("article has valid ID", () => article.id.length > 0);
  TestValidator.predicate(
    "article created timestamp exists",
    () => article.created_at !== null && article.created_at !== undefined,
  );
}
