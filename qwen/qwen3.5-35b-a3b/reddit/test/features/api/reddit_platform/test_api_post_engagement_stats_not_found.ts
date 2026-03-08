import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_engagement_stats_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a simulated user connection to test the endpoint
  // Using simulate mode allows testing without requiring actual user registration
  const userConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // 2. Generate a random UUID that doesn't exist in the database
  const nonExistentStatId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the API and expect 404 error for non-existent engagement stats
  await TestValidator.httpError(
    "engagement stats returns 404 for non-existent statId",
    404,
    async () => {
      await api.functional.redditPlatform.post_engagement_stats.at(
        userConnection,
        {
          statId: nonExistentStatId,
        },
      );
    },
  );
}
