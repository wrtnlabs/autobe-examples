import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

/**
 * Test channel accessibility validation and API response structure for
 * discussion board channels.
 *
 * This test validates the API response structure and TypeScript type safety for
 * the discussion board channel endpoint. Since we cannot create actual channels
 * in this test environment, the focus is on ensuring the API contract is
 * properly maintained and response validation follows the expected DTO
 * structure.
 *
 * The test validates:
 *
 * - API response structure matches IDiscussionBoardChannel interface
 * - Proper TypeScript type safety and compilation
 * - Response validation using typia.assert for comprehensive type checking
 */
export async function test_api_discussion_board_channel_accessibility_validation(
  connection: api.IConnection,
) {
  // Test the API endpoint with a realistic channel name to validate response structure
  // Since we cannot create actual channels, we test with a random name to ensure
  // the API handles the request properly and returns a valid response structure

  const testChannelName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  })
    .replace(/\s+/g, "-")
    .toLowerCase();

  // Call the API and validate the response structure
  // The API may return channel data or handle non-existent channels gracefully
  const channelResponse = await api.functional.discussionBoard.channels.at(
    connection,
    {
      channelName: testChannelName,
    },
  );

  // Use typia.assert to perform comprehensive validation of the response
  // This ensures the response matches the IDiscussionBoardChannel structure
  typia.assert(channelResponse);

  // Validate that the response contains the expected properties
  // Even if the channel doesn't exist, the response should follow the DTO structure
  TestValidator.predicate(
    "response should have channel ID property",
    "id" in channelResponse,
  );

  TestValidator.predicate(
    "response should have channel name property",
    "name" in channelResponse,
  );

  TestValidator.predicate(
    "response should have description property",
    "description" in channelResponse,
  );

  TestValidator.predicate(
    "response should have status property",
    "status" in channelResponse,
  );

  TestValidator.predicate(
    "response should have created_at timestamp",
    "created_at" in channelResponse,
  );

  TestValidator.predicate(
    "response should have updated_at timestamp",
    "updated_at" in channelResponse,
  );

  // Note: The API may return channels with null/undefined deleted_at for active channels
  // or populated deleted_at for soft-deleted channels, both are valid per the DTO
}
