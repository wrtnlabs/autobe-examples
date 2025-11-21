import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test creation of shopping mall channels with various language configurations
 * to validate localization support.
 *
 * This test validates the channel creation API's ability to handle different
 * language configurations, ensuring proper localization support across multiple
 * regions and languages. The test scenarios include:
 *
 * 1. Creating channels with valid language codes (ISO 639-1 format)
 * 2. Testing multilingual marketplace capabilities with different language
 *    combinations
 * 3. Validating currency and timezone configurations for different regions
 * 4. Testing commission rate variations across different market segments
 * 5. Verifying channel code uniqueness and naming conventions
 * 6. Testing proper response structure validation
 * 7. Validating language code format boundaries (min/max lengths)
 * 8. Testing various commission rate ranges
 *
 * The test ensures that the platform can support global marketplace operations
 * with proper localization, regional adaptations, and multi-language
 * capabilities.
 */
export async function test_api_channel_creation_language_localization(
  connection: api.IConnection,
) {
  // Test 1: Create channel with English localization (primary language)
  const englishChannelBody = {
    code: `en_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    currency_code: "USD",
    language: "en",
    time_zone: "America/New_York",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const englishChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: englishChannelBody,
    },
  );
  typia.assert(englishChannel);

  TestValidator.equals(
    "English channel language code",
    englishChannel.language,
    "en",
  );
  TestValidator.equals(
    "English channel currency",
    englishChannel.currency_code,
    "USD",
  );
  TestValidator.equals(
    "English channel timezone",
    englishChannel.time_zone,
    "America/New_York",
  );

  // Test 2: Create channel with Korean localization
  const koreanChannelBody = {
    code: `ko_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(3),
    currency_code: "KRW",
    language: "ko",
    time_zone: "Asia/Seoul",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const koreanChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: koreanChannelBody,
    },
  );
  typia.assert(koreanChannel);

  TestValidator.equals(
    "Korean channel language code",
    koreanChannel.language,
    "ko",
  );
  TestValidator.equals(
    "Korean channel currency",
    koreanChannel.currency_code,
    "KRW",
  );
  TestValidator.equals(
    "Korean channel timezone",
    koreanChannel.time_zone,
    "Asia/Seoul",
  );

  // Test 3: Create channel with Japanese localization
  const japaneseChannelBody = {
    code: `ja_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    currency_code: "JPY",
    language: "ja",
    time_zone: "Asia/Tokyo",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const japaneseChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: japaneseChannelBody,
    },
  );
  typia.assert(japaneseChannel);

  TestValidator.equals(
    "Japanese channel language code",
    japaneseChannel.language,
    "ja",
  );
  TestValidator.equals(
    "Japanese channel currency",
    japaneseChannel.currency_code,
    "JPY",
  );
  TestValidator.equals(
    "Japanese channel timezone",
    japaneseChannel.time_zone,
    "Asia/Tokyo",
  );

  // Test 4: Create channel with European localization (German)
  const germanChannelBody = {
    code: `de_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    currency_code: "EUR",
    language: "de",
    time_zone: "Europe/Berlin",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const germanChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: germanChannelBody,
    },
  );
  typia.assert(germanChannel);

  TestValidator.equals(
    "German channel language code",
    germanChannel.language,
    "de",
  );
  TestValidator.equals(
    "German channel currency",
    germanChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "German channel timezone",
    germanChannel.time_zone,
    "Europe/Berlin",
  );

  // Test 5: Create channel with Chinese localization
  const chineseChannelBody = {
    code: `zh_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 7,
    }),
    currency_code: "CNY",
    language: "zh",
    time_zone: "Asia/Shanghai",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const chineseChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: chineseChannelBody,
    },
  );
  typia.assert(chineseChannel);

  TestValidator.equals(
    "Chinese channel language code",
    chineseChannel.language,
    "zh",
  );
  TestValidator.equals(
    "Chinese channel currency",
    chineseChannel.currency_code,
    "CNY",
  );
  TestValidator.equals(
    "Chinese channel timezone",
    chineseChannel.time_zone,
    "Asia/Shanghai",
  );

  // Test 6: Create channel with Spanish localization
  const spanishChannelBody = {
    code: `es_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    currency_code: "EUR",
    language: "es",
    time_zone: "Europe/Madrid",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const spanishChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: spanishChannelBody,
    },
  );
  typia.assert(spanishChannel);

  TestValidator.equals(
    "Spanish channel language code",
    spanishChannel.language,
    "es",
  );
  TestValidator.equals(
    "Spanish channel currency",
    spanishChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "Spanish channel timezone",
    spanishChannel.time_zone,
    "Europe/Madrid",
  );

  // Test 7: Create channel with maximum commission rate
  const highCommissionChannelBody = {
    code: `high_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
    currency_code: "CAD",
    language: "en",
    time_zone: "America/Toronto",
    commission_rate: 99.99,
  } satisfies IShoppingMallChannel.ICreate;

  const highCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: highCommissionChannelBody,
    });
  typia.assert(highCommissionChannel);

  TestValidator.equals(
    "High commission rate",
    highCommissionChannel.commission_rate,
    99.99,
  );
  TestValidator.equals(
    "High commission channel currency",
    highCommissionChannel.currency_code,
    "CAD",
  );

  // Test 8: Create channel with boundary language code (2 characters - minimum)
  const minLangChannelBody = {
    code: `minlang_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    currency_code: "AUD",
    language: "fr", // 2 characters (minimum length)
    commission_rate: 7.5,
  } satisfies IShoppingMallChannel.ICreate;

  const minLangChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: minLangChannelBody,
    },
  );
  typia.assert(minLangChannel);

  TestValidator.equals(
    "Minimum language code length",
    minLangChannel.language,
    "fr",
  );
  TestValidator.predicate(
    "Language code is 2 characters",
    minLangChannel.language.length === 2,
  );

  // Test 9: Create channel with boundary language code (10 characters - maximum)
  const maxLangChannelBody = {
    code: `maxlang_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    currency_code: "BRL",
    language: "portuguese", // 10 characters (maximum length)
    commission_rate: 12.0,
  } satisfies IShoppingMallChannel.ICreate;

  const maxLangChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: maxLangChannelBody,
    },
  );
  typia.assert(maxLangChannel);

  TestValidator.equals(
    "Maximum language code length",
    maxLangChannel.language,
    "portuguese",
  );
  TestValidator.predicate(
    "Language code is 10 characters",
    maxLangChannel.language.length === 10,
  );

  // Test 10: Verify channel code uniqueness (each created channel should have unique code)
  const channelCodes = [
    englishChannel.code,
    koreanChannel.code,
    japaneseChannel.code,
    germanChannel.code,
    chineseChannel.code,
    spanishChannel.code,
    highCommissionChannel.code,
    minLangChannel.code,
    maxLangChannel.code,
  ];

  TestValidator.predicate(
    "All channel codes are unique",
    channelCodes.length === new Set(channelCodes).size,
  );

  // Test 11: Verify all created channels are active by default
  const allChannels = [
    englishChannel,
    koreanChannel,
    japaneseChannel,
    germanChannel,
    chineseChannel,
    spanishChannel,
    highCommissionChannel,
    minLangChannel,
    maxLangChannel,
  ];

  TestValidator.predicate(
    "All channels are active by default",
    allChannels.every((channel) => channel.is_active === true),
  );

  // Test 12: Verify response structure contains all required properties
  for (const channel of allChannels) {
    TestValidator.predicate(
      `Channel ${channel.code} has required id`,
      channel.id !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required code`,
      channel.code !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required name`,
      channel.name !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required is_active`,
      channel.is_active !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required currency_code`,
      channel.currency_code !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required language`,
      channel.language !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required commission_rate`,
      channel.commission_rate !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required created_at`,
      channel.created_at !== undefined,
    );
    TestValidator.predicate(
      `Channel ${channel.code} has required updated_at`,
      channel.updated_at !== undefined,
    );
  }

  // Test 13: Verify language code format validation (boundary conditions)
  TestValidator.predicate(
    "All language codes have minimum length 2",
    allChannels.every((channel) => channel.language.length >= 2),
  );

  TestValidator.predicate(
    "All language codes have maximum length 10",
    allChannels.every((channel) => channel.language.length <= 10),
  );

  // Test 14: Verify commission rate ranges are respected
  TestValidator.predicate(
    "All commission rates are within valid range (0-100)",
    allChannels.every(
      (channel) =>
        channel.commission_rate >= 0 && channel.commission_rate <= 100,
    ),
  );
}
