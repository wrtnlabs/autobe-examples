import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a cached feed result using a valid resultId.
 * The endpoint should return the complete IRedditPlatformFeedResult DTO containing
 * all cached fields including post_title, post_content, author_username, community_name,
 * post_type, vote_score, comment_count, post_created_at, cached_at, ttl_seconds, and is_active.
 * Verify that all cached fields are correctly retrieved from the reddit_platform_feed_results table.
 */
export async function test_api_feed_result_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid IRedditPlatformFeedResult data using typia.random
  const resultData = typia.random<IRedditPlatformFeedResult>();
  // Retrieve the feed result using the generated resultId
  const result = await api.functional.redditPlatform.results.at(connection, {
    resultId: resultData.id,
  });
  typia.assert(result);
  // Verify all required fields are present in the response
  TestValidator.equals("has valid id", result.id.length > 0, true);
  TestValidator.equals(
    "has feed_preference_id",
    result.feed_preference_id.length > 0,
    true,
  );
  TestValidator.equals("has post_id", result.post_id.length > 0, true);
  TestValidator.equals("has post_title", result.post_title.length > 0, true);
  TestValidator.predicate(
    "has valid post_type",
    ["TEXT", "LINK", "IMAGE"].includes(result.post_type),
  );
  TestValidator.equals(
    "has vote_score",
    typeof result.vote_score === "number",
    true,
  );
  TestValidator.equals(
    "has comment_count",
    typeof result.comment_count === "number",
    true,
  );
  TestValidator.predicate(
    "has valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.cached_at),
  );
  TestValidator.equals(
    "has ttl_seconds",
    typeof result.ttl_seconds === "number",
    true,
  );
  TestValidator.equals(
    "has is_active",
    typeof result.is_active === "boolean",
    true,
  );
  // Test error handling for non-existent resultId
  const invalidId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("should handle non-existent result", async () => {
    await api.functional.redditPlatform.results.at(connection, {
      resultId: invalidId,
    });
  });
}
