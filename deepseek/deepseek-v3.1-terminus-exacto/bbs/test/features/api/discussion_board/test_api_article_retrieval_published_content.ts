import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a published article with complete content and metadata.
 *
 * This test validates that the public article retrieval endpoint correctly returns
 * all article details including content, author information, section categorization,
 * and timestamps without requiring authentication.
 */
export async function test_api_article_retrieval_published_content(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for testing
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the article using the public endpoint
  const article = await api.functional.discussionBoard.articles.at(
    connection, // Using base connection since it's a public endpoint
    { articleId },
  );
  // Validate the complete response structure using typia
  typia.assert(article);
  // Validate business logic relationships that typia doesn't cover
  TestValidator.equals("article ID matches request", article.id, articleId);
  TestValidator.predicate(
    "article has published status",
    article.status === "published",
  );
  // Validate author-section relationship consistency
  TestValidator.predicate(
    "author information is complete",
    article.author.display_name.length > 0 &&
      article.author.created_at.length > 0 &&
      article.author.updated_at.length > 0,
  );
  // Validate section is in valid state
  TestValidator.predicate(
    "section has valid status",
    article.section.status === "active" ||
      article.section.status === "inactive" ||
      article.section.status === "archived",
  );
  // Validate timestamps are in correct order (created_at <= updated_at)
  const createdAt = new Date(article.created_at);
  const updatedAt = new Date(article.updated_at);
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );
}
