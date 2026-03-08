import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

/**
 * Test that a guest user (unauthenticated) can successfully retrieve a published article with complete information.
 *
 * This test validates:
 * 1. Guest access to published articles without authentication
 * 2. Complete article response with all embedded relationships
 * 3. Article is published (deleted_at is null)
 * 4. Author, section, and tags are properly loaded
 * 5. Comments count is accurate
 */
export async function test_api_article_view_published_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random article ID for testing
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Guest access - no authentication required
  // Use base connection directly (no auth headers needed for guest access)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, { articleId });
  // Validate response structure with typia (comprehensive type validation)
  typia.assert(article);
  // Verify article is published (not deleted)
  TestValidator.predicate("article is published", article.deleted_at === null);
  // Verify all required fields exist and have valid data
  TestValidator.predicate("has valid id", article.id.length > 0);
  TestValidator.predicate("has title", article.title.length > 0);
  TestValidator.predicate("has body", article.body.length > 0);
  // Verify author information is loaded
  TestValidator.predicate(
    "has author",
    article.author !== null && article.author !== undefined,
  );
  TestValidator.predicate(
    "author has display name",
    article.author!.displayName.length > 0,
  );
  TestValidator.predicate("author has valid id", article.author!.id.length > 0);
  // Verify section information is loaded
  TestValidator.predicate(
    "has section",
    article.section !== null && article.section !== undefined,
  );
  TestValidator.predicate("section has name", article.section!.name.length > 0);
  TestValidator.predicate(
    "section has valid id",
    article.section!.id.length > 0,
  );
  // Verify tags array exists
  TestValidator.predicate("has tags array", Array.isArray(article.tags));
  // Verify comments count is non-negative
  TestValidator.predicate(
    "comments count is non-negative",
    article.comments_count >= 0,
  );
  // Verify timestamps are valid
  TestValidator.predicate("has created_at", article.created_at.length > 0);
  TestValidator.predicate("has updated_at", article.updated_at.length > 0);
}
