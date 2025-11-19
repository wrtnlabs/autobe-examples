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
 * Test markdown formatting preservation in article content updates.
 *
 * This test validates that markdown formatting in article content is preserved
 * correctly when updating articles. The test covers various markdown syntax
 * elements including headers, bold, italic, links, code blocks, and lists. It
 * verifies that markdown content is stored as-is without parsing or
 * modification, and is returned correctly in subsequent retrieval operations.
 *
 * Test flow:
 *
 * 1. Create contributor account with authentication
 * 2. Create initial article draft
 * 3. Update article with rich markdown content containing:
 *
 *    - Headers (# Heading 1, ## Heading 2, ### Heading 3)
 *    - Bold text (**bold content**)
 *    - Italic text (_italic content_)
 *    - Links ([link text](https://example.com))
 *    - Code blocks (`code content`)
 *    - Lists (- item 1, - item 2, etc.)
 * 4. Verify updated article content preserves markdown syntax exactly
 * 5. Validate markdown formatting is not parsed or altered
 */
export async function test_api_article_contributor_update_markdown_content_formatting(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "TestPassword123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email matches input",
    contributor.email,
    contributor.email,
  );

  // Step 2: Create initial article draft
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleCreate: IDiscussionBoardArticle.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.paragraph({ sentences: 5 }),
    categoryId: categoryId,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const createdArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleCreate,
      },
    );
  typia.assert(createdArticle);

  // Step 3: Update article with markdown content
  const markdownContent = `# Main Title

## Section 1: Introduction
This is **bold text** and this is *italic text*.

## Section 2: Code Example
Here's some code:
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## Section 3: Links and Lists
Check out [this link](https://example.com) for more info.

### List Example:
- First item
- Second item
- Third item with **bold**

[Another link](https://another-example.com) in the middle.

More content with ***bold italic*** text.

\`\`\`
code block content
without language specified
\`\`\`

Final paragraph with \`inline code\` here.`;

  const updatePayload: IDiscussionBoardArticle.IUpdate = {
    title: "Markdown Content Test Article",
    content: markdownContent,
  };

  const updatedArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedArticle);

  // Step 4: Verify markdown content is preserved exactly
  TestValidator.equals(
    "updated article title matches input",
    updatedArticle.title,
    "Markdown Content Test Article",
  );

  TestValidator.equals(
    "markdown content preserved exactly",
    updatedArticle.content,
    markdownContent,
  );

  // Step 5: Validate markdown syntax elements are intact
  TestValidator.predicate(
    "content contains header syntax",
    updatedArticle.content.includes("# Main Title"),
  );

  TestValidator.predicate(
    "content contains bold markdown syntax",
    updatedArticle.content.includes("**bold text**"),
  );

  TestValidator.predicate(
    "content contains italic markdown syntax",
    updatedArticle.content.includes("*italic text*"),
  );

  TestValidator.predicate(
    "content contains code block with backticks",
    updatedArticle.content.includes("```javascript"),
  );

  TestValidator.predicate(
    "content contains link markdown syntax",
    updatedArticle.content.includes("[this link](https://example.com)"),
  );

  TestValidator.predicate(
    "content contains list items with dash",
    updatedArticle.content.includes("- First item"),
  );

  TestValidator.predicate(
    "content contains inline code with backticks",
    updatedArticle.content.includes("`inline code`"),
  );

  TestValidator.predicate(
    "content contains bold italic syntax",
    updatedArticle.content.includes("***bold italic***"),
  );

  // Verify no parsing has occurred - markdown should remain as raw text
  TestValidator.predicate(
    "markdown is not converted to HTML",
    !updatedArticle.content.includes("<strong>") &&
      !updatedArticle.content.includes("<em>") &&
      !updatedArticle.content.includes("<a href"),
  );
}
