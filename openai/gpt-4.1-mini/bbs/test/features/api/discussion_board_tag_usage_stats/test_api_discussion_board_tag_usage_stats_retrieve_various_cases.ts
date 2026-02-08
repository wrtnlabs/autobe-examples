import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_tag_usage_stats_retrieve_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve tag usage statistics with a valid existing usageStatId.
  const validExistingUsageStatId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API function to attempt fetching existing stats
  await api.functional.discussionBoard.tag_usage_stats.at(
    { host: connection.host },
    { usageStatId: validExistingUsageStatId },
  );
  // Scenario 2: Retrieve tag usage statistics with a non-existent usageStatId.
  // Generate a UUID that is not likely to exist
  const nonExistentUsageStatId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "Scenario 2: Expect 404 for non-existent usageStatId",
    404,
    async () => {
      await api.functional.discussionBoard.tag_usage_stats.at(
        { host: connection.host },
        { usageStatId: nonExistentUsageStatId },
      );
    },
  );
  // Scenario 3: Retrieve tag usage statistics for a recently refreshed entity.
  // Simulate using a fresh UUID.
  const recentRefreshedUsageStatId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.discussionBoard.tag_usage_stats.at(
    { host: connection.host },
    { usageStatId: recentRefreshedUsageStatId },
  );
}
