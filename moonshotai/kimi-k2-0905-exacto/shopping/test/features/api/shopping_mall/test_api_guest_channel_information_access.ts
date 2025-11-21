import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test guest access to marketplace channel information without authentication.
 *
 * Validates public accessibility of channel details for unauthenticated users,
 * ensuring consistent marketplace information access across all user types.
 * Tests channel properties, format validation, and data accessibility.
 */
export async function test_api_guest_channel_information_access(
  connection: api.IConnection,
) {
  // Generate multiple test channels to validate various scenarios
  const testScenarios = [
    {
      channelCode: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<100>
      >(),
      description: "Random active channel",
    },
    {
      channelCode: "TEST_CHANNEL_001",
      description: "Specific test channel code",
    },
    {
      channelCode: RandomGenerator.alphabets(8),
      description: "Alphabetic channel code",
    },
  ];

  // Test each scenario
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];

    // Retrieve channel information without authentication
    const channel = await api.functional.shoppingMall.channels.at(connection, {
      channelCode: scenario.channelCode,
    });

    // Validate response structure using typia assertion
    typia.assert(channel);

    // Verify core channel properties
    TestValidator.equals(
      "channel code matches request",
      channel.code,
      scenario.channelCode,
    );
    TestValidator.predicate(
      "channel has valid ID format",
      typia.is<string & tags.Format<"uuid">>(channel.id),
    );
    TestValidator.predicate("channel has valid name", channel.name.length > 0);
    TestValidator.predicate(
      "channel has currency code in correct format",
      channel.currency_code.length === 3,
    );
    TestValidator.predicate(
      "channel has language code in valid format",
      channel.language.length >= 2 && channel.language.length <= 10,
    );

    // Validate commission rate is reasonable
    TestValidator.predicate(
      "commission rate is valid",
      channel.commission_rate >= 0 && channel.commission_rate <= 100,
    );

    // Verify timestamp properties are valid
    TestValidator.predicate(
      "created_at is valid datetime",
      typia.is<string & tags.Format<"date-time">>(channel.created_at),
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      typia.is<string & tags.Format<"date-time">>(channel.updated_at),
    );

    // Validate optional fields exist with proper types or null/undefined
    TestValidator.predicate(
      "description is nullable",
      channel.description === null ||
        channel.description === undefined ||
        typeof channel.description === "string",
    );
    TestValidator.predicate(
      "time_zone is nullable",
      channel.time_zone === null ||
        channel.time_zone === undefined ||
        typeof channel.time_zone === "string",
    );

    // Test that boolean property is properly typed
    TestValidator.predicate(
      "is_active is boolean",
      typeof channel.is_active === "boolean",
    );
  }

  // Test with specific known channel code format
  const codeFormats = ["KOR", "JPN", "USA", "MAIN_WEBSTORE", "MOBILE_PLATFORM"];

  const selectedFormat = RandomGenerator.pick(codeFormats);
  const specificChannel = await api.functional.shoppingMall.channels.at(
    connection,
    {
      channelCode: selectedFormat,
    },
  );

  typia.assert(specificChannel);
  TestValidator.predicate(
    "specific format channel has all required properties",
    specificChannel.id !== undefined &&
      specificChannel.code !== undefined &&
      specificChannel.name !== undefined &&
      specificChannel.is_active !== undefined &&
      specificChannel.currency_code !== undefined &&
      specificChannel.language !== undefined &&
      specificChannel.commission_rate !== undefined &&
      specificChannel.created_at !== undefined &&
      specificChannel.updated_at !== undefined,
  );
}
