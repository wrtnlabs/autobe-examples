import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an existing, active discussion board article by its unique identifier.
 * The test should verify that the system successfully returns the complete article
 * information including title, body content, ownership details (author member information
 * with display name and ban status), section categorization (section name and description),
 * timestamps (created_at, updated_at), and comment count. The response must contain all
 * required fields with correct data types and formats. This validates the primary success
 * path for article viewing functionality where any user (guest, member, or admin) can
 * access public article content.
 */
export async function test_api_article_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random article ID for retrieval
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve the article by ID
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, { articleId });
  // Validate the response structure and types
  typia.assert(article);
  // Validate article ID matches the requested ID
  TestValidator.equals(
    "article ID matches requested ID",
    article.id,
    articleId,
  );
  // Validate article is active (not soft-deleted)
  TestValidator.equals(
    "article is active (deleted_at is null)",
    article.deleted_at,
    null,
  );
  // Validate comment count is non-negative (business logic validation)
  TestValidator.predicate(
    "comments count is non-negative",
    article.comments_count >= 0,
  );
}
