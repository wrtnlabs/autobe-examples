import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test retrieval of specific discussion board channels by their unique name
 * identifier.
 *
 * This test validates that users can access detailed channel information
 * including name, description, status, creation timestamp, and update
 * timestamp. It verifies that the system correctly handles valid channel names,
 * provides comprehensive channel details, and maintains data consistency.
 */
export async function test_api_discussion_board_channel_retrieval_by_name(
  connection: api.IConnection,
) {
  // Generate realistic channel names that might exist in the system
  const channelNames = [
    "Economics",
    "Politics",
    "Technology",
    "Science",
    "Arts",
  ] as const;

  // Test retrieval for each channel name
  for (const channelName of channelNames) {
    const channel: IDiscussionBoardChannel =
      await api.functional.discussionBoard.channels.at(connection, {
        channelName: channelName,
      });

    // Validate the response structure matches the expected DTO type
    typia.assert(channel);

    // Verify the returned channel name matches the requested name
    TestValidator.equals(
      "channel name should match request",
      channel.name,
      channelName,
    );

    // Validate business logic: creation timestamp should be before or equal to update timestamp
    const createdAt = new Date(channel.created_at);
    const updatedAt = new Date(channel.updated_at);
    TestValidator.predicate(
      "creation timestamp should be before or equal to update timestamp",
      createdAt <= updatedAt,
    );

    // Validate business logic: channel should have meaningful content
    TestValidator.predicate(
      "channel description should not be empty",
      channel.description.trim().length > 0,
    );
    TestValidator.predicate(
      "channel status should be a valid state",
      ["active", "inactive", "archived"].includes(channel.status),
    );

    // If channel is soft deleted, validate business logic around deletion
    if (channel.deleted_at !== undefined) {
      const deletedAt = new Date(channel.deleted_at);
      TestValidator.predicate(
        "deletion timestamp should be after creation",
        deletedAt >= createdAt,
      );
      TestValidator.predicate(
        "deleted channel should have inactive or archived status",
        ["inactive", "archived"].includes(channel.status),
      );
    } else {
      TestValidator.predicate(
        "active channel should not have deletion timestamp",
        channel.status === "active",
      );
    }
  }
}
