import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test marketplace channel creation with comprehensive business configuration
 * for new selling environments and multi-marketplace strategies.
 *
 * This test establishes distinct marketplace spaces supporting different
 * customer segments, geographic regions, or product verticals under separate
 * governance while maintaining unified platform infrastructure and customer
 * accounts across all channels. The implementation validates channel creation
 * with comprehensive business configurations including commission management,
 * currency specification, language localization, and operational parameter
 * setup. The test covers successful marketplace channel creation flow ensuring
 * proper configuration of operational settings that enable multi-marketplace
 * strategies where different customer segments or geographic regions can
 * operate under separate governance within unified platform.
 */
export async function test_api_marketplace_channel_creation(
  connection: api.IConnection,
) {
  // Create comprehensive marketplace channel with full configuration
  const mainChannelData = {
    code: `marketplace-${RandomGenerator.alphaNumeric(8)}`,
    name: "Global Electronics Marketplace",
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    currency_code: "USD",
    language: "en",
    time_zone: "UTC",
    commission_rate: 3.5,
  } satisfies IShoppingMallChannel.ICreate;

  const mainChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: mainChannelData,
    },
  );

  typia.assert(mainChannel);

  TestValidator.equals(
    "channel code matches request",
    mainChannel.code,
    mainChannelData.code,
  );
  TestValidator.equals(
    "channel name matches",
    mainChannel.name,
    mainChannelData.name,
  );
  TestValidator.equals(
    "channel description matches",
    mainChannel.description,
    mainChannelData.description,
  );
  TestValidator.equals(
    "currency configuration matches",
    mainChannel.currency_code,
    mainChannelData.currency_code,
  );
  TestValidator.equals(
    "language setting matches",
    mainChannel.language,
    mainChannelData.language,
  );
  TestValidator.equals(
    "timezone configuration matches",
    mainChannel.time_zone,
    mainChannelData.time_zone,
  );
  TestValidator.equals(
    "commission rate matches",
    mainChannel.commission_rate,
    mainChannelData.commission_rate,
  );

  // Validate system-generated properties confirm proper channel initialization
  TestValidator.predicate(
    "channel is active on creation",
    () => mainChannel.is_active === true,
  );
  TestValidator.equals("channel active status", mainChannel.is_active, true);

  // Test channel creation with minimal configuration (no optional fields)
  const basicChannelData = {
    code: `basic-${RandomGenerator.alphaNumeric(6)}`,
    name: "Standard Marketplace",
    currency_code: "EUR",
    language: "de",
    commission_rate: 2.0,
  } satisfies IShoppingMallChannel.ICreate;

  const basicChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: basicChannelData,
    },
  );

  typia.assert(basicChannel);
  TestValidator.equals(
    "basic channel code",
    basicChannel.code,
    basicChannelData.code,
  );
  TestValidator.equals(
    "basic channel currency",
    basicChannel.currency_code,
    "EUR",
  );
  TestValidator.equals("basic channel language", basicChannel.language, "de");
  TestValidator.notEquals(
    "main and basic channels have unique IDs",
    mainChannel.id,
    basicChannel.id,
  );
  TestValidator.notEquals(
    "main and basic channels have unique codes",
    mainChannel.code,
    basicChannel.code,
  );

  // Test specialized marketplace with premium configuration
  const premiumChannelData = {
    code: `premium-${RandomGenerator.alphaNumeric(10)}`,
    name: "Luxury Goods International",
    description:
      "Exclusive marketplace for high-end luxury items and collector pieces",
    currency_code: "GBP",
    language: "en-GB",
    time_zone: "Europe/London",
    commission_rate: 7.5,
  } satisfies IShoppingMallChannel.ICreate;

  const premiumChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: premiumChannelData,
    },
  );

  typia.assert(premiumChannel);
  TestValidator.equals(
    "premium channel specialization",
    premiumChannel.name,
    "Luxury Goods International",
  );
  TestValidator.equals(
    "premium channel currency",
    premiumChannel.currency_code,
    "GBP",
  );
  TestValidator.equals(
    "premium channel commission",
    premiumChannel.commission_rate,
    7.5,
  );

  // Validate channel ecosystem properties across all created channels
  TestValidator.predicate(
    "channels have distinct identifiers",
    () => [mainChannel.id, basicChannel.id, premiumChannel.id].length === 3,
  );

  const allChannels = [mainChannel, basicChannel, premiumChannel];
  TestValidator.predicate(
    "all channels have different commission rates",
    () => {
      const commissionRates = allChannels.map((ch) => ch.commission_rate);
      return new Set(commissionRates).size === commissionRates.length;
    },
  );

  TestValidator.predicate("channels support multiple languages", () => {
    const languages = allChannels.map((ch) => ch.language);
    return (
      languages.includes("en") &&
      languages.includes("de") &&
      languages.includes("en-GB")
    );
  });

  TestValidator.predicate(
    "channels configured for different currencies",
    () => {
      const currencies = allChannels.map((ch) => ch.currency_code);
      return (
        currencies.includes("USD") &&
        currencies.includes("EUR") &&
        currencies.includes("GBP")
      );
    },
  );
}
