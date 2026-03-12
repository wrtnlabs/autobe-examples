import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_retrieval_by_guest(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a guest user can successfully retrieve a complete article by its unique identifier.
   *
   * This test validates the GET /discussionBoard/articles/{articleId} endpoint which allows
   * all users including guests to view articles. The test verifies that the response contains
   * all required fields including nested objects (section, author), tags array, and comment count.
   */
  // Generate a valid UUID for the article ID
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Call the article retrieval endpoint (no authentication required for guest access)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId,
    });
  // Validate the complete response structure
  typia.assert(article);
  // Validate that the returned article ID matches the requested ID
  TestValidator.equals("article ID matches request", article.id, articleId);
  // Validate that title and content are non-empty strings
  TestValidator.predicate("title is non-empty", article.title.length > 0);
  TestValidator.predicate("content is non-empty", article.content.length > 0);
  // Validate that timestamps are present (created_at and updated_at should always exist)
  TestValidator.predicate(
    "created_at is present",
    article.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    article.updated_at.length > 0,
  );
  // Validate section object has required fields
  TestValidator.predicate(
    "section has valid ID",
    article.section.id.length > 0,
  );
  TestValidator.predicate("section has name", article.section.name.length > 0);
  // Validate author object has required fields
  TestValidator.predicate("author has valid ID", article.author.id.length > 0);
  TestValidator.predicate("author has email", article.author.email.length > 0);
  TestValidator.predicate(
    "author banned is boolean",
    typeof article.author.banned === "boolean",
  );
  // Validate tags array exists and can be iterated
  TestValidator.predicate("tags is an array", Array.isArray(article.tags));
  // Validate each tag in the array has required fields
  for (const tag of article.tags) {
    TestValidator.predicate("tag has valid ID", tag.id.length > 0);
    TestValidator.predicate("tag has name", tag.name.length > 0);
  }
  // Validate comments_count is a non-negative integer
  TestValidator.predicate(
    "comments_count is non-negative",
    article.comments_count >= 0,
  );
}
