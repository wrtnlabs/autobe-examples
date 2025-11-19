import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test channel creation with various status configurations (active, inactive,
 * archived). The scenario validates that moderators can create channels in
 * different initial states and that each status properly controls channel
 * availability and behavior. The test should verify that status field
 * validation works correctly and that system behavior aligns with the specified
 * status.
 */
export async function test_api_discussion_board_channel_creation_with_different_statuses(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      password: "securePassword123",
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
      moderation_level: "senior",
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Define status values to test
  const statuses = ["active", "inactive", "archived"] as const;

  // Step 2-4: Create channels with different statuses
  const createdChannels: IDiscussionBoardChannel[] = [];

  for (const status of statuses) {
    const channel =
      await api.functional.discussionBoard.moderator.channels.create(
        connection,
        {
          body: {
            name: `Channel ${status} - ${RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 })}`,
            description: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 8,
              sentenceMax: 15,
            }),
            status: status,
          } satisfies IDiscussionBoardChannel.ICreate,
        },
      );
    typia.assert(channel);
    createdChannels.push(channel);

    // Validate status is correctly set
    TestValidator.equals(
      `channel ${status} status should match`,
      channel.status,
      status,
    );

    // Validate required fields are present
    TestValidator.predicate(
      `channel ${status} should have valid ID`,
      channel.id.length > 0,
    );
    TestValidator.predicate(
      `channel ${status} should have non-empty name`,
      channel.name.length > 0,
    );
    TestValidator.predicate(
      `channel ${status} should have non-empty description`,
      channel.description.length > 0,
    );

    // Validate timestamps
    TestValidator.predicate(
      `channel ${status} should have created_at timestamp`,
      channel.created_at.length > 0,
    );
    TestValidator.predicate(
      `channel ${status} should have updated_at timestamp`,
      channel.updated_at.length > 0,
    );
  }

  // Step 5: Validate that all channels have unique IDs
  const channelIds = createdChannels.map((channel) => channel.id);
  const uniqueIds = new Set(channelIds);
  TestValidator.equals(
    "all channel IDs should be unique",
    channelIds.length,
    uniqueIds.size,
  );

  // Validate that created channels have different names
  const channelNames = createdChannels.map((channel) => channel.name);
  const uniqueNames = new Set(channelNames);
  TestValidator.equals(
    "all channel names should be unique",
    channelNames.length,
    uniqueNames.size,
  );

  // Verify that channels were created in sequence (timestamps should be increasing)
  for (let i = 1; i < createdChannels.length; i++) {
    const prevChannel = createdChannels[i - 1];
    const currentChannel = createdChannels[i];

    // Check that timestamps are in chronological order using date comparison
    const prevDate = new Date(prevChannel.created_at);
    const currentDate = new Date(currentChannel.created_at);

    TestValidator.predicate(
      `channel ${i + 1} should be created after or at same time as channel ${i}`,
      prevDate <= currentDate,
    );
  }
}
