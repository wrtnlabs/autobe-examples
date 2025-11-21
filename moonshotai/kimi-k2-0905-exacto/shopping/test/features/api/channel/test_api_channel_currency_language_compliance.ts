import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_currency_language_compliance(
  connection: api.IConnection,
) {
  // List of common ISO 4217 currency codes for testing
  const iso4217Currencies = [
    "USD", // US Dollar
    "EUR", // Euro
    "JPY", // Japanese Yen
    "GBP", // British Pound
    "CNY", // Chinese Yuan
    "KRW", // Korean Won
    "AUD", // Australian Dollar
    "CAD", // Canadian Dollar
    "CHF", // Swiss Franc
    "MXN", // Mexican Peso
  ] as const;

  // List of common language codes for international support
  const languageCodes = [
    "en",
    "ko",
    "ja",
    "zh",
    "es",
    "fr",
    "de",
    "pt",
    "ru",
    "ar",
  ] as const;

  // List of common timezones for regional operations
  const timezones = [
    "America/New_York",
    "Europe/London",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Australia/Sydney",
    "America/Los_Angeles",
    "America/Mexico_City",
    "Europe/Berlin",
    "Asia/Dubai",
  ] as const;

  // Create multiple channels testing different international configurations
  const channels = await ArrayUtil.asyncRepeat(5, async (index) => {
    const currency = RandomGenerator.pick(iso4217Currencies);
    const language = RandomGenerator.pick(languageCodes);
    const timezone = RandomGenerator.pick(timezones);
    const description = RandomGenerator.paragraph({ sentences: 3 });

    const channelData = {
      code: `channel_${RandomGenerator.alphabets(5)}_${index + 1}`,
      name: `${RandomGenerator.name(2)} International Marketplace`,
      description: description,
      currency_code: currency,
      language: language,
      time_zone: timezone,
      commission_rate: typia.random<
        number & tags.Minimum<0> & tags.Maximum<100>
      >(),
    } satisfies IShoppingMallChannel.ICreate;

    const channel = await api.functional.shoppingMall.channels.create(
      connection,
      {
        body: channelData,
      },
    );

    typia.assert(channel);
    return channel;
  });

  // Test USD Dollar channel with English localization
  const usdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "us_marketplace",
        name: "US Marketplace",
        description:
          "Marketplace for customers in the United States using USD currency",
        currency_code: "USD",
        language: "en",
        time_zone: "America/New_York",
        commission_rate: 8.5, // 8.5% commission typical for US market
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(usdChannel);

  TestValidator.equals(
    "USD channel currency code",
    usdChannel.currency_code,
    "USD",
  );
  TestValidator.equals("USD channel language", usdChannel.language, "en");
  TestValidator.equals(
    "USD channel timezone",
    usdChannel.time_zone,
    "America/New_York",
  );
  TestValidator.predicate(
    "USD commission rate valid",
    usdChannel.commission_rate >= 0 && usdChannel.commission_rate <= 100,
  );

  // Test EUR Euro channel for European market
  const eurChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "eu_marketplace",
        name: "European Marketplace",
        description: "Marketplace serving European customers with EUR currency",
        currency_code: "EUR",
        language: "en",
        time_zone: "Europe/Berlin",
        commission_rate: 15.0, // Higher commission typical for European market
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(eurChannel);

  TestValidator.equals(
    "EUR channel currency code",
    eurChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "EUR channel timezone",
    eurChannel.time_zone,
    "Europe/Berlin",
  );
  TestValidator.predicate(
    "EUR commission within valid range",
    eurChannel.commission_rate <= 100,
  );

  // Test Asian market channel with local language
  const asianChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "asia_marketplace",
        name: "東アジア市場", // Japanese text for multi-language support
        description:
          "Marketplace serving Asian region with local currency support",
        currency_code: "JPY",
        language: "ja",
        time_zone: "Asia/Tokyo",
        commission_rate: 12.5, // Commission rate for Japanese market
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(asianChannel);

  TestValidator.equals(
    "Asian channel currency code",
    asianChannel.currency_code,
    "JPY",
  );
  TestValidator.equals("Asian channel language", asianChannel.language, "ja");
  TestValidator.equals(
    "Asian channel timezone",
    asianChannel.time_zone,
    "Asia/Tokyo",
  );

  // Test channel with optional timezone (null/undefined)
  const simpleChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "simple_marketplace",
        name: "Simple Marketplace",
        description: "Basic marketplace without timezone specification",
        currency_code: "GBP",
        language: "en",
        time_zone: null,
        commission_rate: 10.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(simpleChannel);

  TestValidator.equals(
    "Simple channel currency code",
    simpleChannel.currency_code,
    "GBP",
  );
  TestValidator.equals("Simple channel language", simpleChannel.language, "en");
  TestValidator.equals(
    "Simple channel timezone is null",
    simpleChannel.time_zone,
    null,
  );

  // Validate currency codes are 3 characters (ISO 4217 standard)
  channels.forEach((channel) => {
    TestValidator.equals(
      `Channel ${channel.code} currency length`,
      channel.currency_code.length,
      3,
    );
    TestValidator.predicate(
      `Channel ${channel.code} is uppercase currency`,
      channel.currency_code === channel.currency_code.toUpperCase(),
    );
  });

  // Validate language codes follow standard patterns
  channels.forEach((channel) => {
    TestValidator.predicate(
      `Channel ${channel.code} language code valid`,
      channel.language.length >= 2 && channel.language.length <= 5,
    );
  });

  // Validate commission rates are within valid range
  [...channels, usdChannel, eurChannel, asianChannel, simpleChannel].forEach(
    (channel) => {
      TestValidator.predicate(
        `Channel ${channel.code} commission rate >= 0`,
        channel.commission_rate >= 0,
      );
      TestValidator.predicate(
        `Channel ${channel.code} commission rate <= 100`,
        channel.commission_rate <= 100,
      );
    },
  );

  // Test error handling for invalid data types (business logic validation - not type errors)
  await TestValidator.error(
    "should reject commission rate above 100",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: "invalid_commission",
          name: "Invalid Commission Channel",
          currency_code: "USD",
          language: "en",
          commission_rate: 150.0, // Above 100% should fail business validation
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  await TestValidator.error(
    "should reject negative commission rate",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: "negative_commission",
          name: "Negative Commission Channel",
          currency_code: "EUR",
          language: "fr",
          commission_rate: -5.0, // Negative commission should fail
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test currency and language consistency across multiple channels
  const consistentData = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: `regional_${index + 1}`,
        name: `Regional Marketplace ${index + 1}`,
        currency_code: RandomGenerator.pick(["USD", "EUR", "GBP"]),
        language: "en", // Consistent language, varying currencies
        commission_rate: 8.0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  });

  consistentData.forEach((channel) => {
    TestValidator.predicate(
      `Regional channel ${channel.code} has valid currency`,
      ["USD", "EUR", "GBP"].includes(channel.currency_code),
    );
    TestValidator.equals(
      `Regional channel ${channel.code} language consistency`,
      channel.language,
      "en",
    );
  });

  // Overall validation: All channels created successfully
  TestValidator.equals(
    "Total channels created successfully",
    [
      ...channels,
      usdChannel,
      eurChannel,
      asianChannel,
      simpleChannel,
      ...consistentData,
    ].length,
    9,
  );
}
