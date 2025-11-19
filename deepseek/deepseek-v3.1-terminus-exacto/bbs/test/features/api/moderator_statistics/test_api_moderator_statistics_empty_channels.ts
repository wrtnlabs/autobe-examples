import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardChannelStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannelStatistics";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPostTrendDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostTrendDirection";

/**
 * Test statistics retrieval for channels with no posts to validate that empty
 * channels show zero counts and proper trend indicators. Verify that statistics
 * handle edge cases gracefully and provide meaningful data even for inactive
 * channels.
 */
export async function test_api_moderator_statistics_empty_channels(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "basic",
      ip: "127.0.0.1",
      href: "https://example.com/dashboard",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a single empty channel to test statistics
  const channel =
    await api.functional.discussionBoard.moderator.channels.create(connection, {
      body: {
        name: "Empty Test Channel",
        description: "Test channel with no posts for statistics validation",
        status: "active",
      } satisfies IDiscussionBoardChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Retrieve statistics - note this returns aggregated data for all channels
  const statistics =
    await api.functional.discussion_board.moderator.statistics.posts_by_channel.statistics(
      connection,
    );
  typia.assert(statistics);

  // Step 4: Validate statistics structure and empty channel behavior
  TestValidator.equals(
    "statistics should contain valid channel information",
    statistics.channel.id,
    channel.id,
  );

  TestValidator.equals(
    "empty channel should have zero total posts",
    statistics.total_posts,
    0,
  );

  TestValidator.equals(
    "percentage distribution should be zero for empty channel",
    statistics.percentage_distribution,
    0,
  );

  TestValidator.equals(
    "average posts per day should be zero for empty channel",
    statistics.average_posts_per_day,
    0,
  );

  TestValidator.predicate(
    "trend direction should be valid for empty channel",
    statistics.trend_direction === "stable" ||
      statistics.trend_direction === "decreasing",
  );

  TestValidator.predicate(
    "last activity timestamp should be valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(
      statistics.last_activity_at,
    ),
  );

  // Additional validation: Ensure channel summary matches created channel
  TestValidator.equals(
    "channel name in statistics should match created channel",
    statistics.channel.name,
    channel.name,
  );

  TestValidator.equals(
    "channel description in statistics should match",
    statistics.channel.description,
    channel.description,
  );

  TestValidator.equals(
    "channel status in statistics should match",
    statistics.channel.status,
    channel.status,
  );
}
