import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test comprehensive channel information retrieval including all available
 * metadata.
 *
 * This test validates that the detailed channel view includes complete
 * information such as UUID identifier, channel name, detailed description,
 * current operational status, creation and update timestamps, and soft deletion
 * status when applicable. The test ensures that the data structure aligns with
 * the Prisma schema and that all fields are populated correctly for active
 * channels.
 */
export async function test_api_discussion_board_channel_comprehensive_details(
  connection: api.IConnection,
) {
  // Generate a realistic channel name for testing
  const channelName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  })
    .replace(/\s+/g, " ")
    .trim();

  // Retrieve detailed channel information
  const channel: IDiscussionBoardChannel =
    await api.functional.discussionBoard.channels.at(connection, {
      channelName: channelName,
    });

  // Validate the complete response structure - this performs ALL type validation
  typia.assert(channel);

  // Test data integrity by calling the API again with the same channel name
  const channelReloaded: IDiscussionBoardChannel =
    await api.functional.discussionBoard.channels.at(connection, {
      channelName: channelName,
    });

  typia.assert(channelReloaded);

  // Verify that subsequent calls return consistent data (business logic validation)
  TestValidator.equals(
    "reloaded channel ID matches original",
    channelReloaded.id,
    channel.id,
  );
  TestValidator.equals(
    "reloaded channel name matches original",
    channelReloaded.name,
    channel.name,
  );
  TestValidator.equals(
    "reloaded channel description matches original",
    channelReloaded.description,
    channel.description,
  );
  TestValidator.equals(
    "reloaded channel status matches original",
    channelReloaded.status,
    channel.status,
  );
  TestValidator.equals(
    "reloaded created_at matches original",
    channelReloaded.created_at,
    channel.created_at,
  );
  TestValidator.equals(
    "reloaded updated_at matches original",
    channelReloaded.updated_at,
    channel.updated_at,
  );
  TestValidator.equals(
    "reloaded deleted_at matches original",
    channelReloaded.deleted_at,
    channel.deleted_at,
  );
}
