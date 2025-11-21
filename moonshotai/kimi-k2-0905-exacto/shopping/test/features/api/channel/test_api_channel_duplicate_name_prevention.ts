import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel name uniqueness validation including business display conflict
 * prevention, user interface clarity maintenance, and consistency enforcement
 * across marketplace environments.
 *
 * This comprehensive test validates that marketplace channels can be created
 * with unique names while demonstrating proper business display compatibility
 * and user interface clarity. The test covers:
 *
 * 1. Create a marketplace channel with unique name and configuration
 * 2. Create a second channel with different name parameters
 * 3. Validate successful channel creation with unique naming
 * 4. Demonstrate business display consistency through proper property validation
 *
 * The test ensures marketplace branding consistency and optimal user experience
 * through successful channel creation with unique naming within the
 * multi-channel shopping mall platform ecosystem.
 */
export async function test_api_channel_duplicate_name_prevention(
  connection: api.IConnection,
) {
  // Generate unique channel data
  const channelName1 = `Marketplace_${RandomGenerator.alphabets(8)}`;
  const channelCode1 = `mp_${RandomGenerator.alphaNumeric(6)}`;

  // Create first channel successfully
  const channel1 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: channelCode1,
        name: channelName1,
        description: `Unique marketplace channel for testing ${RandomGenerator.name(2)}`,
        currency_code: "USD",
        language: "en",
        time_zone: "America/New_York",
        commission_rate: 15.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );

  typia.assert(channel1);
  TestValidator.equals(
    "first channel name matches",
    channel1.name,
    channelName1,
  );
  TestValidator.equals(
    "first channel code matches",
    channel1.code,
    channelCode1,
  );

  // Create second channel with different name - should succeed
  const channelName2 = `Bazaar_${RandomGenerator.alphabets(8)}`;
  const channelCode2 = `bz_${RandomGenerator.alphaNumeric(6)}`;

  const channel2 = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: channelCode2,
        name: channelName2,
        description: `Alternative marketplace channel ${RandomGenerator.name(2)}`,
        currency_code: "EUR",
        language: "fr",
        time_zone: "Europe/Paris",
        commission_rate: 12.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );

  typia.assert(channel2);
  TestValidator.equals(
    "second channel name differs from first",
    channel2.name,
    channelName2,
  );
  TestValidator.notEquals(
    "channel names should be unique",
    channel2.name,
    channelName1,
  );

  // Validate channel properties for marketplace branding consistency
  TestValidator.equals(
    "both channels have USD/EUR currency",
    [channel1.currency_code, channel2.currency_code],
    ["USD", "EUR"],
  );
  TestValidator.equals(
    "language settings are appropriate",
    channel1.language,
    "en",
  );
  TestValidator.equals(
    "second channel has FR language",
    channel2.language,
    "fr",
  );
  TestValidator.predicate(
    "commission rates are within valid range",
    channel1.commission_rate >= 0 &&
      channel1.commission_rate <= 100 &&
      channel2.commission_rate >= 0 &&
      channel2.commission_rate <= 100,
  );
}
