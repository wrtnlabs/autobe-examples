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
 * Test article creation with markdown-formatted content.
 *
 * A contributor creates an article with markdown syntax including headers,
 * bold, italic, lists, code blocks, and links. The test validates that markdown
 * content is properly stored and later retrieved with formatting preserved.
 * Confirms that the system supports rich text formatting through markdown and
 * handles markdown syntax correctly without corruption or unexpected
 * interpretation.
 *
 * Test Flow:
 *
 * 1. Register a new contributor account
 * 2. Create an article with comprehensive markdown content
 * 3. Verify the markdown content is preserved exactly
 * 4. Validate markdown syntax elements are intact
 */
export async function test_api_article_creation_markdown_content(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "SecurePass123!@#",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create comprehensive markdown content
  const markdownContent =
    "# Main Article Title\n\n" +
    "## Section 1: Basic Formatting\n\n" +
    "This paragraph contains **bold text**, *italic text*, and ***bold italic text***.\n\n" +
    "## Section 2: Lists\n\n" +
    "### Unordered List\n" +
    "- Item one with some text\n" +
    "- Item two with more content\n" +
    "- Item three with additional information\n\n" +
    "### Ordered List\n" +
    "1. First step in the process\n" +
    "2. Second step with details\n" +
    "3. Third step with explanation\n\n" +
    "## Section 3: Code Block\n\n" +
    "Here is some example code:\n\n" +
    "```javascript\n" +
    "function fibonacci(n) {\n" +
    "  if (n <= 1) return n;\n" +
    "  return fibonacci(n - 1) + fibonacci(n - 2);\n" +
    "}\n" +
    "```\n\n" +
    "## Section 4: Links and References\n\n" +
    "Check out [this link](https://example.com) for more information.\n\n" +
    "Visit our [documentation](https://docs.example.com/guide) for detailed guides.\n\n" +
    "## Section 5: Inline Code\n\n" +
    "Use the `console.log()` function for debugging purposes.\n\n" +
    "## Conclusion\n\n" +
    "This markdown content demonstrates various formatting features that should be preserved exactly as written.";

  // Step 3: Create article with markdown content
  const categoryId: string & tags.Format<"uuid"> =
    "550e8400-e29b-41d4-a716-446655440000" as any;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Comprehensive Markdown Formatting Test",
          content: markdownContent,
          categoryId: categoryId,
          href: "https://example.com/article/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Validate article properties
  TestValidator.equals(
    "article title matches",
    article.title,
    "Comprehensive Markdown Formatting Test",
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    markdownContent,
  );
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals("article view count is zero", article.view_count, 0);
  TestValidator.equals(
    "article comment count is zero",
    article.comment_count,
    0,
  );
  TestValidator.predicate("article is not pinned", !article.is_pinned);
  TestValidator.predicate("article is not locked", !article.is_locked);

  // Step 5: Validate markdown syntax preservation
  TestValidator.predicate(
    "markdown headers are preserved",
    article.content.includes("# Main Article Title") &&
      article.content.includes("## Section 1: Basic Formatting") &&
      article.content.includes("### Unordered List"),
  );

  TestValidator.predicate(
    "markdown bold formatting preserved",
    article.content.includes("**bold text**"),
  );

  TestValidator.predicate(
    "markdown italic formatting preserved",
    article.content.includes("*italic text*"),
  );

  TestValidator.predicate(
    "markdown code block preserved",
    article.content.includes("```javascript") &&
      article.content.includes("function fibonacci(n)"),
  );

  TestValidator.predicate(
    "markdown links preserved",
    article.content.includes("[this link](https://example.com)") &&
      article.content.includes(
        "[documentation](https://docs.example.com/guide)",
      ),
  );

  TestValidator.predicate(
    "markdown inline code preserved",
    article.content.includes("`console.log()`"),
  );

  TestValidator.predicate(
    "markdown lists preserved",
    article.content.includes("- Item one") &&
      article.content.includes("1. First step"),
  );

  // Step 6: Verify author information is correctly set
  TestValidator.equals(
    "article author id matches",
    article.author.id,
    contributor.id,
  );
  TestValidator.equals(
    "article author username matches",
    article.author.username,
    contributor.username,
  );
}
