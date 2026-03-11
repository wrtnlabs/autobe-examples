import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error handling when attempting to retrieve metadata for non-existent articles.
 * Validates that the system returns appropriate HTTP 404 responses when the specified
 * article ID does not exist in the database. Tests only with valid UUID formats to
 * ensure we're testing business logic errors, not type validation errors.
 */
export async function test_api_article_metadata_nonexistent_article_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // Test with valid UUID format that doesn't exist in the system
  await TestValidator.httpError(
    "non-existent article should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.metadata.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // Test with another valid but non-existent UUID
  await TestValidator.httpError(
    "another non-existent article should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.metadata.at(connection, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
