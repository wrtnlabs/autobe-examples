import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_engagement_stats_non_existent_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID that doesn't correspond to any real post
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Call the API with the non-existent post ID
  // Expect a 404 error to be returned
  await TestValidator.httpError(
    "should return 404 for non-existent post",
    [404],
    async () => {
      await api.functional.redditPlatform.post_engagement_stats.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
