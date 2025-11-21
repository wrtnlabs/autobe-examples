import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test creation of multiple marketplace channels for multi-environment
 * operations including country-specific channels, premium seller channels, or
 * specialized product verticals. Validates unique code enforcement and distinct
 * operational parameter configuration.
 *
 * This test validates the creation of diverse marketplace environments by
 * creating multiple channels with different configurations that represent
 * various operational contexts. The test creates country-specific channels,
 * premium seller channels, and specialized product vertical channels with
 * distinct operational parameters.
 *
 * Business Context:
 *
 * - Country-specific channels (US, EU, Asia-Pacific markets)
 * - Premium seller channels with differentiated commission structures
 * - Specialized vertical channels (electronics, fashion, home goods)
 * - Unique channel codes for system-wide identification
 * - Operational diversity in currencies, languages, and time zones
 *
 * Validation Points:
 *
 * - Successful channel creation with valid configurations
 * - Unique channel code enforcement across the system
 * - Proper commission rate settings (0-100% range)
 * - Correct currency code formatting (3-character ISO)
 * - Language code validation (2-10 characters)
 * - Channel activation status handling
 * - Date-time field population
 * - Channel metadata integrity
 *
 * Test Flow:
 *
 * 1. Create multiple channels with different operational parameters
 * 2. Verify unique channel codes work correctly
 * 3. Test commission rate boundaries
 * 4. Validate currency and language configurations
 * 5. Check channel status and activity
 * 6. Basic retrieval and data integrity checks
 */
export async function test_api_channel_create_multiple_marketplace_strategy(
  connection: api.IConnection,
) {
  // Create US marketplace channel for North American operations
  const usChannelBody = {
    code: "us-market",
    name: "US Market",
    description:
      "North American marketplace with USD currency and EST timezone",
    currency_code: "USD",
    language: "en-US",
    time_zone: "America/New_York",
    commission_rate: 8.5,
  } satisfies IShoppingMallChannel.ICreate;

  const usChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: usChannelBody,
    },
  );
  typia.assert(usChannel);

  // Create EU marketplace channel for European operations
  const euChannelBody = {
    code: "eu-market",
    name: "EU Market",
    description:
      "European marketplace with EUR currency and multiple language support",
    currency_code: "EUR",
    language: "en-GB",
    time_zone: "Europe/London",
    commission_rate: 12.0,
  } satisfies IShoppingMallChannel.ICreate;

  const euChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: euChannelBody,
    },
  );
  typia.assert(euChannel);

  // Create premium seller channel with higher commission rate
  const premiumChannelBody = {
    code: "premium-sellers",
    name: "Premium Sellers",
    description:
      "High-end marketplace with enhanced services and premium features",
    currency_code: "USD",
    language: "en-US",
    time_zone: "UTC",
    commission_rate: 2.5,
  } satisfies IShoppingMallChannel.ICreate;

  const premiumChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: premiumChannelBody,
    },
  );
  typia.assert(premiumChannel);

  // Create Asia-Pacific channel for multiple regions
  const apacChannelBody = {
    code: "apac-market",
    name: "APAC Market",
    description:
      "Asia-Pacific marketplace supporting multiple currencies and timezones",
    currency_code: "JPY",
    language: "ja-JP",
    time_zone: "Asia/Tokyo",
    commission_rate: 6.5,
  } satisfies IShoppingMallChannel.ICreate;

  const apacChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: apacChannelBody,
    },
  );
  typia.assert(apacChannel);

  // Create specialized vertical channel for electronics
  const electronicsChannelBody = {
    code: "electronics-vertical",
    name: "Electronics Channel",
    description:
      "Specialized marketplace for consumer electronics and tech products",
    currency_code: "USD",
    language: "en-US",
    time_zone: "America/Los_Angeles",
    commission_rate: 5.0,
  } satisfies IShoppingMallChannel.ICreate;

  const electronicsChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: electronicsChannelBody,
    },
  );
  typia.assert(electronicsChannel);

  // Test commission rate boundary conditions
  const zeroCommissionBody = {
    code: "zero-commission",
    name: "Zero Commission Channel",
    description: "Marketplace with no commission fees for promotional purposes",
    currency_code: "USD",
    language: "en-US",
    time_zone: "UTC",
    commission_rate: 0.0,
  } satisfies IShoppingMallChannel.ICreate;

  const zeroCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: zeroCommissionBody,
    });
  typia.assert(zeroCommissionChannel);

  // Test maximum commission rate
  const maxCommissionBody = {
    code: "maximum-commission",
    name: "Maximum Commission Channel",
    description: "Channel with maximum allowable commission rate",
    currency_code: "USD",
    language: "en-US",
    time_zone: "UTC",
    commission_rate: 100.0,
  } satisfies IShoppingMallChannel.ICreate;

  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: maxCommissionBody,
    });
  typia.assert(maxCommissionChannel);

  // Validate all created channels have unique codes
  const createdChannels = [
    usChannel,
    euChannel,
    premiumChannel,
    apacChannel,
    electronicsChannel,
    zeroCommissionChannel,
    maxCommissionChannel,
  ];
  const channelCodes = createdChannels.map((channel) => channel.code);

  TestValidator.predicate(
    "all channel codes are unique",
    new Set(channelCodes).size === channelCodes.length,
  );

  // Validate currency codes are 3 characters
  TestValidator.predicate(
    "all currency codes have correct format",
    createdChannels.every(
      (channel) =>
        channel.currency_code.length === 3 &&
        /^[A-Z]{3}$/.test(channel.currency_code),
    ),
  );

  // Validate language codes
  TestValidator.predicate(
    "all language codes have valid format",
    createdChannels.every(
      (channel) =>
        channel.language.length >= 2 && channel.language.length <= 10,
    ),
  );

  // Validate commission rates are within valid range
  TestValidator.predicate(
    "all commission rates are within valid range 0-100",
    createdChannels.every(
      (channel) =>
        channel.commission_rate >= 0 && channel.commission_rate <= 100,
    ),
  );

  // Validate channels have proper activation status
  TestValidator.predicate(
    "all channels are active by default",
    createdChannels.every((channel) => channel.is_active === true),
  );

  // Validate date-time fields are populated
  TestValidator.predicate(
    "all channels have created_at timestamps",
    createdChannels.every(
      (channel) =>
        channel.created_at &&
        typia.is<string & tags.Format<"date-time">>(channel.created_at),
    ),
  );

  TestValidator.predicate(
    "all channels have updated_at timestamps",
    createdChannels.every(
      (channel) =>
        channel.updated_at &&
        typia.is<string & tags.Format<"date-time">>(channel.updated_at),
    ),
  );

  // Test that duplicate channel codes are rejected
  await TestValidator.error(
    "duplicate channel code should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: "us-market", // Duplicate of first channel
          name: "Duplicate US Market",
          currency_code: "USD",
          language: "en-US",
          commission_rate: 9.0,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Validate specific channel configurations
  TestValidator.equals("US channel currency", usChannel.currency_code, "USD");
  TestValidator.equals("EU channel currency", euChannel.currency_code, "EUR");
  TestValidator.equals("US channel language", usChannel.language, "en-US");
  TestValidator.equals("APAC channel language", apacChannel.language, "ja-JP");
  TestValidator.equals(
    "Premium channel name",
    premiumChannel.name,
    "Premium Sellers",
  );
  TestValidator.equals(
    "Zero commission rate",
    zeroCommissionChannel.commission_rate,
    0.0,
  );
  TestValidator.equals(
    "Max commission rate",
    maxCommissionChannel.commission_rate,
    100.0,
  );

  // Validate time zones where specified
  TestValidator.equals(
    "US channel timezone",
    usChannel.time_zone,
    "America/New_York",
  );
  TestValidator.equals(
    "EU channel timezone",
    euChannel.time_zone,
    "Europe/London",
  );
  TestValidator.equals(
    "APAC channel timezone",
    apacChannel.time_zone,
    "Asia/Tokyo",
  );
}
