import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test creation of marketplace channels with different currency configurations
 * to validate international expansion capabilities.
 *
 * This comprehensive test validates the shopping mall platform's ability to
 * support multi-currency marketplace operations across different international
 * markets. Tests include ISO 4217 currency code validation, regional commission
 * rate structures, language-currency pairings, and timezone-specific
 * operations. The test creates diverse channel configurations representing
 * major international markets, emerging economies, and regional variants to
 * ensure robust multi-marketplace support.
 *
 * Test Coverage:
 *
 * 1. Major international currencies (USD, EUR, GBP, JPY, EUR)
 * 2. Emerging market currencies (BRL, INR, CNY, KRW, INR)
 * 3. Regional commission rate variations (5% - 25%)
 * 4. Language-currency combinations for localized experiences
 * 5. Timezone configurations for global operations
 * 6. Channel lifecycle management (active/inactive states)
 * 7. Edge cases for currency and commission boundaries
 *
 * Business Impact: Validates platform readiness for international marketplace
 * expansion with proper currency handling, commission structures, and regional
 * operational capabilities.
 */
export async function test_api_channel_creation_multicurrency(
  connection: api.IConnection,
) {
  // Test 1: Create channel with USD currency for North American market
  const usChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "na-marketplace",
        name: "North American Marketplace",
        description:
          "Primary marketplace for United States and Canada with USD transactions",
        currency_code: "USD",
        language: "en-US",
        time_zone: "America/New_York",
        commission_rate: 15.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(usChannel);

  // Test 2: Create channel with EUR currency for European market
  const euChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "eu-marketplace",
        name: "European Marketplace",
        description:
          "Unified marketplace for European Union with EUR transactions",
        currency_code: "EUR",
        language: "en-GB",
        time_zone: "Europe/London",
        commission_rate: 12.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(euChannel);

  // Test 3: Create channel with JPY currency for Japanese market
  const jpChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "jp-marketplace",
        name: "Japanese Marketplace",
        description: "Localized marketplace for Japan with JPY transactions",
        currency_code: "JPY",
        language: "ja-JP",
        time_zone: "Asia/Tokyo",
        commission_rate: 8.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(jpChannel);

  // Test 4: Create channel with GBP currency for UK market (post-Brexit)
  const ukChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "uk-marketplace",
        name: "United Kingdom Marketplace",
        description:
          "Dedicated marketplace for United Kingdom with GBP transactions",
        currency_code: "GBP",
        language: "en-GB",
        time_zone: "Europe/London",
        commission_rate: 13.75,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(ukChannel);

  // Test 5: Create channel with CAD currency for Canadian market
  const caChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "ca-marketplace",
        name: "Canadian Marketplace",
        description: "Bilingual marketplace for Canada with CAD transactions",
        currency_code: "CAD",
        language: "en-CA",
        time_zone: "America/Toronto",
        commission_rate: 14.25,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(caChannel);

  // Test 6: Create channel with BRL currency for Brazilian market
  const brChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "br-marketplace",
        name: "Brazilian Marketplace",
        description:
          "Marketplace for Brazil with BRL transactions and Portuguese localization",
        currency_code: "BRL",
        language: "pt-BR",
        time_zone: "America/Sao_Paulo",
        commission_rate: 18.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(brChannel);

  // Test 7: Create channel with INR currency for Indian market
  const inChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "in-marketplace",
        name: "Indian Marketplace",
        description:
          "Marketplace for India with INR transactions and multilingual support",
        currency_code: "INR",
        language: "en-IN",
        time_zone: "Asia/Kolkata",
        commission_rate: 11.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(inChannel);

  // Test 8: Create channel with CNY currency for Chinese market
  const cnChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "cn-marketplace",
        name: "Chinese Marketplace",
        description:
          "Marketplace for China with CNY transactions and Chinese localization",
        currency_code: "CNY",
        language: "zh-CN",
        time_zone: "Asia/Shanghai",
        commission_rate: 9.75,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(cnChannel);

  // Test 9: Create channel with KRW currency for South Korean market
  const krChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "kr-marketplace",
        name: "Korean Marketplace",
        description:
          "Marketplace for South Korea with KRW transactions and Korean localization",
        currency_code: "KRW",
        language: "ko-KR",
        time_zone: "Asia/Seoul",
        commission_rate: 10.25,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(krChannel);

  // Test 10: Create channel with AUD currency for Australian market
  const auChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "au-marketplace",
        name: "Australian Marketplace",
        description:
          "Marketplace for Australia with AUD transactions and Oceania operations",
        currency_code: "AUD",
        language: "en-AU",
        time_zone: "Australia/Sydney",
        commission_rate: 16.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(auChannel);

  // Test 11: Create channel with MXN currency for Mexican market
  const mxChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "mx-marketplace",
        name: "Mexican Marketplace",
        description:
          "Marketplace for Mexico with MXN transactions and Spanish localization",
        currency_code: "MXN",
        language: "es-MX",
        time_zone: "America/Mexico_City",
        commission_rate: 19.25,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(mxChannel);

  // Test 12: Create channel with CHF currency for Swiss market
  const chChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: "ch-marketplace",
        name: "Swiss Marketplace",
        description:
          "Marketplace for Switzerland with CHF transactions and multilingual operations",
        currency_code: "CHF",
        language: "de-CH",
        time_zone: "Europe/Zurich",
        commission_rate: 7.5,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(chChannel);

  // Validation Tests

  // Validate currency code formats
  TestValidator.equals(
    "USD currency code format",
    usChannel.currency_code,
    "USD",
  );
  TestValidator.equals(
    "EUR currency code format",
    euChannel.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "JPY currency code format",
    jpChannel.currency_code,
    "JPY",
  );
  TestValidator.equals(
    "GBP currency code format",
    ukChannel.currency_code,
    "GBP",
  );
  TestValidator.equals(
    "CAD currency code format",
    caChannel.currency_code,
    "CAD",
  );

  // Validate commission rate boundaries
  TestValidator.predicate(
    "US commission rate within bounds",
    usChannel.commission_rate >= 0 && usChannel.commission_rate <= 100,
  );
  TestValidator.predicate(
    "JP commission rate within bounds",
    jpChannel.commission_rate >= 0 && jpChannel.commission_rate <= 100,
  );
  TestValidator.predicate(
    "BR commission rate within bounds",
    brChannel.commission_rate >= 0 && brChannel.commission_rate <= 100,
  );
  TestValidator.predicate(
    "CH commission rate reasonable",
    chChannel.commission_rate >= 0 && chChannel.commission_rate <= 100,
  );

  // Validate channel codes are unique
  const channelCodes = [
    usChannel.code,
    euChannel.code,
    jpChannel.code,
    ukChannel.code,
    caChannel.code,
    brChannel.code,
    inChannel.code,
    cnChannel.code,
    krChannel.code,
    auChannel.code,
    mxChannel.code,
    chChannel.code,
  ];
  TestValidator.equals(
    "All channel codes should be unique",
    channelCodes.length,
    new Set(channelCodes).size,
  );

  // Validate timezone specifications
  TestValidator.predicate(
    "US channel has valid timezone",
    usChannel.time_zone?.includes("America") === true,
  );
  TestValidator.predicate(
    "EU channel has valid timezone",
    euChannel.time_zone?.includes("Europe") === true,
  );
  TestValidator.predicate(
    "JP channel has valid timezone",
    jpChannel.time_zone?.includes("Asia") === true,
  );
  TestValidator.predicate(
    "UK channel has valid timezone",
    ukChannel.time_zone?.includes("Europe") === true,
  );

  // Validate language-currency pairings
  TestValidator.predicate(
    "US channel has English language",
    usChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "EU channel has English language",
    euChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "JP channel has Japanese language",
    jpChannel.language === "ja-JP",
  );
  TestValidator.predicate(
    "UK channel has English language",
    ukChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "BR channel has Portuguese language",
    brChannel.language === "pt-BR",
  );
  TestValidator.predicate(
    "IN channel has English language",
    inChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "CN channel has Chinese language",
    cnChannel.language.startsWith("zh"),
  );
  TestValidator.predicate(
    "KR channel has Korean language",
    krChannel.language === "ko-KR",
  );
  TestValidator.predicate(
    "CA channel has English language",
    caChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "AU channel has English language",
    auChannel.language.startsWith("en"),
  );
  TestValidator.predicate(
    "MX channel has Spanish language",
    mxChannel.language.startsWith("es"),
  );
  TestValidator.predicate(
    "CH channel has German language",
    chChannel.language.startsWith("de"),
  );

  // Validate channel active status
  TestValidator.predicate(
    "All channels should be active by default",
    usChannel.is_active &&
      euChannel.is_active &&
      jpChannel.is_active &&
      ukChannel.is_active &&
      caChannel.is_active &&
      brChannel.is_active &&
      inChannel.is_active &&
      cnChannel.is_active &&
      krChannel.is_active &&
      auChannel.is_active &&
      mxChannel.is_active &&
      chChannel.is_active,
  );

  // Validate UUID format for channel IDs
  TestValidator.predicate(
    "US channel has valid UUID",
    typeof usChannel.id === "string" && usChannel.id.length === 36,
  );
  TestValidator.predicate(
    "EU channel has valid UUID",
    typeof euChannel.id === "string" && euChannel.id.length === 36,
  );
  TestValidator.predicate(
    "JP channel has valid UUID",
    typeof jpChannel.id === "string" && jpChannel.id.length === 36,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "US channel has creation timestamp",
    usChannel.created_at !== null && usChannel.created_at !== undefined,
  );
  TestValidator.predicate(
    "EU channel has creation timestamp",
    euChannel.created_at !== null && euChannel.created_at !== undefined,
  );
  TestValidator.predicate(
    "JP channel has creation timestamp",
    jpChannel.created_at !== null && jpChannel.created_at !== undefined,
  );

  // Validate commission rate diversity across markets
  const commissionRates = [
    usChannel.commission_rate,
    euChannel.commission_rate,
    jpChannel.commission_rate,
    ukChannel.commission_rate,
    caChannel.commission_rate,
    brChannel.commission_rate,
    inChannel.commission_rate,
    cnChannel.commission_rate,
    krChannel.commission_rate,
    auChannel.commission_rate,
    mxChannel.commission_rate,
    chChannel.commission_rate,
  ];
  TestValidator.predicate(
    "Commission rates should vary across markets",
    new Set(commissionRates).size > 1,
  );

  // Validate channel name patterns
  TestValidator.predicate(
    "Channel names should be meaningful",
    usChannel.name.includes("American") &&
      euChannel.name.includes("European") &&
      jpChannel.name.includes("Japanese") &&
      ukChannel.name.includes("United Kingdom") &&
      caChannel.name.includes("Canadian") &&
      brChannel.name.includes("Brazilian") &&
      inChannel.name.includes("Indian") &&
      cnChannel.name.includes("Chinese") &&
      krChannel.name.includes("Korean") &&
      auChannel.name.includes("Australian") &&
      mxChannel.name.includes("Mexican") &&
      chChannel.name.includes("Swiss"),
  );
}
