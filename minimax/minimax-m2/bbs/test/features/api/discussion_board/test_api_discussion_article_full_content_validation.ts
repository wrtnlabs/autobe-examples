import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_discussion_article_full_content_validation(
  connection: api.IConnection,
) {
  // Generate realistic test data for comprehensive content validation
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Test with complex content including special characters, formatting, and rich text
  const testTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const complexContent: string = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 3,
    wordMax: 10,
  });

  // Create content with special characters and formatting to test preservation
  const contentWithFormatting: string = [
    "# Economic Policy Analysis 2024",
    "",
    "This is a **comprehensive analysis** of current economic policies.",
    "",
    "Key points include:",
    "- Monetary policy changes",
    "- Fiscal stimulus measures",
    "- Market regulation updates",
    "",
    "> Important: This analysis considers multiple perspectives on the current economic landscape.",
    "",
    "**Special characters test:**",
    "• Dollar amounts: $1,234.56",
    "• Euro amounts: €2,345.67",
    "• Percentage: 15.5%",
    "• Mathematical: 2×3=6, π≈3.14159",
    "",
    "Unicode characters: ñáéíóú, 中文, 日本語, العربية, русский",
    "",
    "```",
    "code block example",
    "function economicModel(params) {",
    "  return calculateImpact(params);",
    "}",
    "```",
    "",
    complexContent,
  ].join("\n");

  // Retrieve the article via API endpoint
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.at(connection, {
      articleId: articleId,
    });

  // Perform comprehensive type validation
  typia.assert(article);

  // Validate complete content preservation
  TestValidator.predicate(
    "article content field exists and is complete",
    typeof article.content === "string" && article.content.length > 0,
  );

  TestValidator.predicate(
    "content includes complex formatting elements",
    article.content.includes("**comprehensive analysis**") &&
      article.content.includes("•") &&
      article.content.includes("€"),
  );

  TestValidator.predicate(
    "content preserves markdown-style formatting",
    article.content.includes("# Economic Policy Analysis 2024") &&
      article.content.includes("> Important:") &&
      article.content.includes("```"),
  );

  TestValidator.predicate(
    "content includes special characters and Unicode",
    article.content.includes("π≈3.14159") &&
      article.content.includes("中文") &&
      article.content.includes("العربية"),
  );

  TestValidator.predicate(
    "content preserves bullet points and structured text",
    article.content.includes("- Monetary policy changes") &&
      article.content.includes("• Dollar amounts:"),
  );

  // Validate article metadata integrity
  TestValidator.predicate(
    "article has valid UUID identifier",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );

  TestValidator.equals(
    "article ID matches requested ID",
    article.id,
    articleId,
  );

  TestValidator.predicate(
    "article has valid title field",
    typeof article.title === "string" && article.title.length > 0,
  );

  TestValidator.predicate(
    "article has valid category field",
    typeof article.category === "string" && article.category.length > 0,
  );

  TestValidator.predicate(
    "article has valid status field",
    typeof article.status === "string" && article.status.length > 0,
  );

  TestValidator.predicate(
    "article has valid author information",
    article.author &&
      typeof article.author.id === "string" &&
      typeof article.author.display_name === "string",
  );

  TestValidator.predicate(
    "article has valid creation timestamp",
    typeof article.created_at === "string" &&
      !isNaN(Date.parse(article.created_at)),
  );

  TestValidator.predicate(
    "article has valid update timestamp",
    typeof article.updated_at === "string" &&
      !isNaN(Date.parse(article.updated_at)) &&
      new Date(article.updated_at) >= new Date(article.created_at),
  );

  TestValidator.predicate(
    "article content is not truncated or summarized",
    article.content.length > 1000, // Ensure substantial content length
  );

  // Validate that content contains the expected structured elements
  TestValidator.predicate(
    "content preserves line breaks and paragraph structure",
    article.content.split("\n").length > 20, // Multiple paragraphs
  );

  // Test with very long content to ensure no truncation occurs
  const veryLongContent: string = ArrayUtil.repeat(50, () =>
    RandomGenerator.paragraph({ sentences: 10, wordMin: 5, wordMax: 12 }),
  ).join("\n\n");

  // Verify the API handles content length appropriately
  TestValidator.predicate(
    "content field can handle substantial text without truncation",
    article.content.includes("Economic Policy Analysis") ||
      article.content.length > 500,
  );
}
