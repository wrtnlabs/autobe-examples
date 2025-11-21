import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test that shopping mall channels can be retrieved publicly by their unique
 * channel code. Validates that channel information including name, description,
 * status, and configuration details are accessible without authentication. This
 * scenario tests the core functionality of channel discovery and information
 * access for customers browsing the shopping mall platform. The test verifies
 * that all channel metadata is returned correctly and that the response
 * structure matches the expected schema format.
 */
export async function test_api_channel_public_retrieval(
  connection: api.IConnection,
) {
  // Generate a realistic channel code using alphanumeric characters
  const channelCode = RandomGenerator.alphaNumeric(8);

  // Call the API to retrieve channel information
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.at(connection, {
      channelCode: channelCode,
    });

  // Validate the response structure matches the expected schema
  typia.assert(channel);

  // Verify all required fields are present and properly formatted
  TestValidator.predicate(
    "channel code should match requested code",
    channel.code === channelCode,
  );

  TestValidator.predicate(
    "channel name should not be empty",
    channel.name.length > 0,
  );

  TestValidator.predicate(
    "channel status should not be empty",
    channel.status.length > 0,
  );

  // Validate optional description field if present
  if (channel.description !== undefined && channel.description !== null) {
    TestValidator.predicate(
      "description should be present when defined",
      channel.description.length > 0,
    );
  }

  // Validate optional configuration field if present
  if (channel.configuration !== undefined && channel.configuration !== null) {
    TestValidator.predicate(
      "configuration should have config_key when present",
      channel.configuration.config_key.length > 0,
    );
  }

  // Validate optional parent field if present
  if (channel.parent !== undefined && channel.parent !== null) {
    TestValidator.predicate(
      "parent channel should have name when present",
      channel.parent.name.length > 0,
    );
    TestValidator.predicate(
      "parent channel should have code when present",
      channel.parent.code.length > 0,
    );
  }
}
