import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with multi-language support for international
 * marketplace operations.
 *
 * This comprehensive test validates the platform's ability to create
 * marketplace channels with various language configurations, supporting global
 * e-commerce operations. The test covers multiple scenarios including different
 * language codes, currency combinations, timezone settings, and commission
 * rates to ensure robust international support.
 *
 * Test scenarios include:
 *
 * 1. Channel creation with major world languages (English, Chinese, Japanese,
 *    Korean)
 * 2. Regional marketplace configurations with appropriate currencies
 * 3. Timezone support for different geographic regions
 * 4. Commission rate validation across different markets
 * 5. Channel code uniqueness and validation
 * 6. Response data integrity and type safety
 *
 * The test ensures that the platform can handle diverse international
 * marketplace requirements while maintaining consistent API behavior and data
 * validation.
 */
export async function test_api_channel_creation_multi_language_support(
  connection: api.IConnection,
) {
  // Test 1: Create channel with English language and USD currency
  const englishChannel = {
    code: `en-us-market-${RandomGenerator.alphaNumeric(8)}`,
    name: "US Marketplace",
    description:
      "Primary English-language marketplace for North American customers",
    currency_code: "USD",
    language: "en-US",
    time_zone: "America/New_York",
    commission_rate: 5.5,
  } satisfies IShoppingMallChannel.ICreate;

  const createdEnglishChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: englishChannel,
    });
  typia.assert(createdEnglishChannel);

  TestValidator.equals(
    "English channel code matches",
    createdEnglishChannel.code,
    englishChannel.code,
  );
  TestValidator.equals(
    "English channel language",
    createdEnglishChannel.language,
    "en-US",
  );
  TestValidator.equals(
    "English channel currency",
    createdEnglishChannel.currency_code,
    "USD",
  );
  TestValidator.equals(
    "English channel timezone",
    createdEnglishChannel.time_zone,
    "America/New_York",
  );

  // Test 2: Create channel with Chinese language and CNY currency
  const chineseChannel = {
    code: `zh-cn-market-${RandomGenerator.alphaNumeric(8)}`,
    name: "中国市场",
    description: "面向中国客户的本土化市场平台",
    currency_code: "CNY",
    language: "zh-CN",
    time_zone: "Asia/Shanghai",
    commission_rate: 3.0,
  } satisfies IShoppingMallChannel.ICreate;

  const createdChineseChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: chineseChannel,
    });
  typia.assert(createdChineseChannel);

  TestValidator.equals(
    "Chinese channel code matches",
    createdChineseChannel.code,
    chineseChannel.code,
  );
  TestValidator.equals(
    "Chinese channel language",
    createdChineseChannel.language,
    "zh-CN",
  );
  TestValidator.equals(
    "Chinese channel currency",
    createdChineseChannel.currency_code,
    "CNY",
  );

  // Test 3: Create channel with Japanese language and JPY currency
  const japaneseChannel = {
    code: `ja-jp-market-${RandomGenerator.alphaNumeric(8)}`,
    name: "日本マーケット",
    description: "日本向けの専用マーケットプレイス",
    currency_code: "JPY",
    language: "ja-JP",
    time_zone: "Asia/Tokyo",
    commission_rate: 4.2,
  } satisfies IShoppingMallChannel.ICreate;

  const createdJapaneseChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: japaneseChannel,
    });
  typia.assert(createdJapaneseChannel);

  TestValidator.equals(
    "Japanese channel language",
    createdJapaneseChannel.language,
    "ja-JP",
  );
  TestValidator.equals(
    "Japanese channel currency",
    createdJapaneseChannel.currency_code,
    "JPY",
  );

  // Test 4: Create channel with Korean language and KRW currency
  const koreanChannel = {
    code: `ko-kr-market-${RandomGenerator.alphaNumeric(8)}`,
    name: "한국 마켓",
    description: "한국 고객을 위한 지역화된 마켓플레이스",
    currency_code: "KRW",
    language: "ko-KR",
    time_zone: "Asia/Seoul",
    commission_rate: 2.8,
  } satisfies IShoppingMallChannel.ICreate;

  const createdKoreanChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: koreanChannel,
    });
  typia.assert(createdKoreanChannel);

  TestValidator.equals(
    "Korean channel language",
    createdKoreanChannel.language,
    "ko-KR",
  );
  TestValidator.equals(
    "Korean channel currency",
    createdKoreanChannel.currency_code,
    "KRW",
  );

  // Test 5: Create channel with European configuration (EUR, multiple languages)
  const europeanChannel = {
    code: `eu-market-${RandomGenerator.alphaNumeric(8)}`,
    name: "European Union Marketplace",
    description:
      "Multi-language marketplace for EU customers supporting various European languages",
    currency_code: "EUR",
    language: "en-GB", // Using British English as primary for EU market
    time_zone: "Europe/London",
    commission_rate: 6.0,
  } satisfies IShoppingMallChannel.ICreate;

  const createdEuropeanChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: europeanChannel,
    });
  typia.assert(createdEuropeanChannel);

  TestValidator.equals(
    "European channel currency",
    createdEuropeanChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "European channel language",
    createdEuropeanChannel.language,
    "en-GB",
  );

  // Test 6: Validate channel code uniqueness - attempt to create duplicate should fail
  await TestValidator.error("Duplicate channel code should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: englishChannel.code, // Reusing the same code
        name: "Duplicate Channel",
        currency_code: "CAD",
        language: "en-CA",
        commission_rate: 4.0,
      } satisfies IShoppingMallChannel.ICreate,
    });
  });

  // Test 7: Create channel with minimal required fields (no optional fields)
  const minimalChannel = {
    code: `minimal-${RandomGenerator.alphaNumeric(8)}`,
    name: "Minimal Test Channel",
    currency_code: "USD",
    language: "en",
    commission_rate: 1.0,
  } satisfies IShoppingMallChannel.ICreate;

  const createdMinimalChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: minimalChannel,
    });
  typia.assert(createdMinimalChannel);

  TestValidator.equals(
    "Minimal channel has default active status",
    createdMinimalChannel.is_active,
    true,
  );
  TestValidator.equals(
    "Minimal channel code",
    createdMinimalChannel.code,
    minimalChannel.code,
  );

  // Test 8: Validate commission rate boundaries
  const highCommissionChannel = {
    code: `high-commission-${RandomGenerator.alphaNumeric(8)}`,
    name: "Premium Channel",
    description: "High-commission premium marketplace",
    currency_code: "USD",
    language: "en",
    commission_rate: 99.9, // Very high commission rate
  } satisfies IShoppingMallChannel.ICreate;

  const createdHighCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: highCommissionChannel,
    });
  typia.assert(createdHighCommissionChannel);

  TestValidator.predicate(
    "High commission rate is within bounds",
    createdHighCommissionChannel.commission_rate <= 100,
  );

  // Validate all created channels have proper timestamps
  const allChannels = [
    createdEnglishChannel,
    createdChineseChannel,
    createdJapaneseChannel,
    createdKoreanChannel,
    createdEuropeanChannel,
    createdMinimalChannel,
    createdHighCommissionChannel,
  ];

  for (const channel of allChannels) {
    TestValidator.predicate(
      "Channel has valid created_at timestamp",
      channel.created_at !== null,
    );
    TestValidator.predicate(
      "Channel has valid updated_at timestamp",
      channel.updated_at !== null,
    );
    TestValidator.predicate(
      "Channel ID is valid format",
      typeof channel.id === "string" && channel.id.length > 0,
    );
  }
}
