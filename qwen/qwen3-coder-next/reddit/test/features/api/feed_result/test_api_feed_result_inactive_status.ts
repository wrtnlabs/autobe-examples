import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_result_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing
  const resultId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve a feed result (this will use the simulate functionality if enabled)
  const result = await api.functional.redditPlatform.results.at(connection, {
    resultId,
  });
  // Validate the response structure
  typia.assert(result);
  // Verify the is_active field exists and has boolean type
  TestValidator.predicate(
    "is_active is boolean",
    typeof result.is_active === "boolean",
  );
  // Verify all required fields from IRedditPlatformFeedResult are present
  TestValidator.equals(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(result.id),
    true,
  );
  TestValidator.equals(
    "feed_preference_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(result.feed_preference_id),
    true,
  );
  TestValidator.equals(
    "post_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(result.post_id),
    true,
  );
  TestValidator.predicate(
    "post_title is string",
    typeof result.post_title === "string",
  );
  TestValidator.predicate(
    "author_username is string",
    typeof result.author_username === "string",
  );
  TestValidator.predicate(
    "community_name is string",
    typeof result.community_name === "string",
  );
  TestValidator.predicate(
    "post_type is string",
    typeof result.post_type === "string",
  );
  TestValidator.predicate(
    "vote_score is number",
    typeof result.vote_score === "number",
  );
  TestValidator.predicate(
    "comment_count is number",
    typeof result.comment_count === "number",
  );
  TestValidator.equals(
    "ttl_seconds is number",
    typeof result.ttl_seconds === "number",
    true,
  );
  TestValidator.predicate(
    "post_created_at is ISO string",
    typeof result.post_created_at === "string",
  );
  TestValidator.predicate(
    "cached_at is ISO string",
    typeof result.cached_at === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof result.created_at === "string",
  );
}
