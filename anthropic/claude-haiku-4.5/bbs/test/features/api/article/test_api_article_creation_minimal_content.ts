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
 * Test article creation with minimum valid content length.
 *
 * This test validates that the discussion board API correctly handles article
 * creation at the minimum length boundaries. It ensures that:
 *
 * 1. Contributors can register new accounts successfully
 * 2. Articles can be created with exactly the minimum required title length (5
 *    characters)
 * 3. Articles can be created with exactly the minimum required content length (50
 *    characters)
 * 4. The API properly validates minimum length constraints without rejecting valid
 *    minimal content
 * 5. Created articles are stored correctly with all metadata
 *
 * Workflow:
 *
 * 1. Register a new contributor account for the discussion board
 * 2. Generate a category ID for article categorization
 * 3. Create an article with minimal but valid content (title: 5 chars, content: 50
 *    chars)
 * 4. Verify the article was created successfully with correct properties
 * 5. Validate that the article's status is 'draft' and contains all required
 *    fields
 */
export async function test_api_article_creation_minimal_content(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphaNumeric(8);
  const contributorPassword = "SecurePass123!";

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

  // Step 2: Generate a category ID for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create an article with minimal valid content
  // Title: exactly 5 characters (minimum boundary)
  const minimalTitle = "Lorem";
  TestValidator.equals(
    "title length is exactly 5 characters",
    minimalTitle.length,
    5,
  );

  // Content: exactly 50 characters (minimum boundary)
  const minimalContent =
    "Lorem ipsum dolor sit amet consectetur adipiscing elit.";
  TestValidator.equals(
    "content length is exactly 50 characters",
    minimalContent.length,
    50,
  );

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: minimalTitle,
          content: minimalContent,
          categoryId: categoryId,
          href: "https://example.com/article/create",
          referrer: "https://example.com/article/editor",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  // Step 4: Verify article creation with minimal content succeeds
  TestValidator.equals(
    "created article title matches minimal input",
    createdArticle.title,
    minimalTitle,
  );
  TestValidator.equals(
    "created article content matches minimal input",
    createdArticle.content,
    minimalContent,
  );

  // Step 5: Validate article properties and business logic
  TestValidator.equals(
    "article status is draft after creation",
    createdArticle.status,
    "draft",
  );
  TestValidator.equals(
    "article author is authenticated contributor",
    createdArticle.author.id,
    contributor.id,
  );
  TestValidator.predicate(
    "article view count initialized to zero",
    createdArticle.view_count === 0,
  );
  TestValidator.predicate(
    "article comment count initialized to zero",
    createdArticle.comment_count === 0,
  );
}
