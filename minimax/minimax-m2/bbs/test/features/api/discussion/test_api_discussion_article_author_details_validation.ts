import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test that author information is complete and accurate when retrieving
 * discussion articles.
 *
 * Validates that the retrieved article includes complete author details from
 * the econ_political_discussion_users relationship including author
 * display_name, avatar_url, and status information for proper attribution and
 * community features.
 *
 * This test ensures that article retrieval properly populates author
 * information which is critical for community features like author profile
 * linking, content attribution, and user recognition within the discussion
 * board.
 */
export async function test_api_discussion_article_author_details_validation(
  connection: api.IConnection,
) {
  // Generate a realistic article ID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the article using the API
  const article: IEconPoliticalDiscussionArticle =
    await api.functional.econPoliticalDiscussion.articles.at(connection, {
      articleId: articleId,
    });

  // Validate the complete article structure with type safety
  typia.assert(article);

  // Validate that author information exists and is properly structured
  TestValidator.predicate(
    "article should have author information",
    article.author !== null && article.author !== undefined,
  );

  // Validate author ID format (should be valid UUID)
  TestValidator.predicate(
    "author ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.author.id,
    ),
  );

  // Validate author display_name is present and meaningful
  TestValidator.predicate(
    "author display_name should be present and non-empty",
    article.author.display_name !== null &&
      article.author.display_name !== undefined &&
      article.author.display_name.trim().length > 0,
  );

  // Validate author status is present (common statuses: active, inactive, suspended, etc.)
  TestValidator.predicate(
    "author status should be present and meaningful",
    article.author.status !== null &&
      article.author.status !== undefined &&
      article.author.status.trim().length > 0,
  );

  // Validate avatar_url structure (optional field - can be null, undefined, or valid URL)
  if (
    article.author.avatar_url !== null &&
    article.author.avatar_url !== undefined
  ) {
    TestValidator.predicate(
      "author avatar_url should be valid URL format when present",
      article.author.avatar_url.startsWith("http://") ||
        article.author.avatar_url.startsWith("https://"),
    );
  }

  // Ensure author information is sufficient for community features
  TestValidator.predicate(
    "author information should enable proper attribution",
    article.author.id !== null &&
      article.author.display_name !== null &&
      article.author.status !== null,
  );

  // Validate author details support community interaction features
  TestValidator.predicate(
    "author details should support community features",
    typeof article.author.id === "string" &&
      typeof article.author.display_name === "string" &&
      typeof article.author.status === "string",
  );
}
