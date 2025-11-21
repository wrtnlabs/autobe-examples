import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";

/**
 * Test public retrieval of community platform channels by unique name
 * identifier.
 *
 * Validates that channels can be retrieved with complete metadata including
 * display name, description, icon and banner URLs, sorting order, and status
 * information. The API always returns valid channel data regardless of the
 * channel name provided, as it generates random channel data for any input.
 */
export async function test_api_channel_public_retrieval(
  connection: api.IConnection,
) {
  // Generate a realistic channel name for testing
  const channelName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  })
    .toLowerCase()
    .replace(/\s+/g, "-");

  // Test retrieval of a channel - the API always returns valid data
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.channels.at(connection, {
      channelName: channelName,
    });

  // Validate the response type and structure - this ensures all required properties exist
  typia.assert(channel);

  // Verify basic property assignments (typia.assert already validates types and formats)
  TestValidator.equals(
    "channel name matches requested name",
    channel.name,
    channelName,
  );
  TestValidator.predicate("channel has valid UUID ID", channel.id.length > 0);
  TestValidator.predicate(
    "channel has display name",
    channel.display_name.length > 0,
  );
  TestValidator.predicate(
    "channel has description",
    channel.description.length > 0,
  );
  TestValidator.predicate(
    "sort order is integer",
    Number.isInteger(channel.sort_order),
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof channel.is_active === "boolean",
  );
  TestValidator.predicate("status is defined", channel.status.length > 0);
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(channel.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(channel.updated_at).toString() !== "Invalid Date",
  );

  // Test with different channel name to ensure the API works consistently
  const anotherChannelName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 6,
  })
    .toLowerCase()
    .replace(/\s+/g, "-");

  const anotherChannel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.channels.at(connection, {
      channelName: anotherChannelName,
    });

  typia.assert(anotherChannel);
  TestValidator.equals(
    "second channel name matches requested name",
    anotherChannel.name,
    anotherChannelName,
  );
  TestValidator.notEquals(
    "different channel names return different data",
    channel.id,
    anotherChannel.id,
  );
}
