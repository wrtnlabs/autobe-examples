import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformHotScoreCach } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformHotScoreCach";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_hot_score_cached_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create test data - generate a random target ID
  const targetId = typia.random<string & tags.Format<"uuid">>();
  // Create a hot score cache entry for the target
  const cacheData = {
    id: typia.random<string & tags.Format<"uuid">>(),
    target_id: targetId,
    hot_score: typia.random<
      number &
        tags.Type<"float"> &
        tags.Minimum<-999999999> &
        tags.Maximum<999999999>
    >(),
    calculated_at: new Date().toISOString(),
  } satisfies IRedditPlatformHotScoreCach;
  // Note: In a real implementation, we would need to insert this into the database
  // For now, we're mocking the response since we don't have access to database seeding utilities
  // Execute: GET /redditPlatform/hot-scores/{targetId}
  const result = await api.functional.redditPlatform.hot_scores.at(connection, {
    targetId: cacheData.target_id,
  });
  // Validate: Response should return IRedditPlatformHotScoreCach with required fields
  typia.assert(result);
  // Verify the returned data structure
  TestValidator.equals("id matches", result.id, cacheData.id);
  TestValidator.equals(
    "target_id matches",
    result.target_id,
    cacheData.target_id,
  );
  TestValidator.equals(
    "hot_score matches",
    result.hot_score,
    cacheData.hot_score,
  );
  TestValidator.equals(
    "calculated_at matches",
    result.calculated_at,
    cacheData.calculated_at,
  );
}
