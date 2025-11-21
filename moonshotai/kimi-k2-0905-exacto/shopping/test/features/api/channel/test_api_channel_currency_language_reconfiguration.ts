import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_channel_currency_language_reconfiguration(
  connection: api.IConnection,
) {
  // Create initial channel with USD currency and English language
  const initialChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency_code: "USD",
        language: "en",
        commission_rate: 5.0,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(initialChannel);

  // Test 1: Update currency to EUR (Euro) - primary international marketplace
  const eurUpdate = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: initialChannel.code,
      body: {
        id: initialChannel.id,
        currency_code: "EUR",
        language: "en", // Maintain English for European market
        name: `${initialChannel.name} - European Market`,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(eurUpdate);

  TestValidator.equals(
    "EUR currency update succeeded",
    eurUpdate.currency_code,
    "EUR",
  );
  TestValidator.equals(
    "European market name updated",
    eurUpdate.name,
    `${initialChannel.name} - European Market`,
  );

  // Test 2: Update to Asian market configuration (JPY + Japanese)
  const asianConfig = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: eurUpdate.code,
      body: {
        id: eurUpdate.id,
        currency_code: "JPY",
        language: "ja",
        time_zone: "Asia/Tokyo",
        commission_rate: 3.5, // Lower commission for competitive Japanese market
        description: "日本市場向けショッピングモールチャンネル",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(asianConfig);

  TestValidator.equals(
    "JPY currency for Asian market",
    asianConfig.currency_code,
    "JPY",
  );
  TestValidator.equals("Japanese language setting", asianConfig.language, "ja");
  TestValidator.equals(
    "Tokyo timezone configured",
    asianConfig.time_zone,
    "Asia/Tokyo",
  );
  TestValidator.equals(
    "Competitive commission rate",
    asianConfig.commission_rate,
    3.5,
  );

  // Test 3: Switch to Korean market (KRW + Korean)
  const koreanChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: asianConfig.code,
      body: {
        id: asianConfig.id,
        currency_code: "KRW",
        language: "ko",
        time_zone: "Asia/Seoul",
        commission_rate: 4.0,
        name: `${initialChannel.name} - 한국 시장`,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(koreanChannel);

  TestValidator.equals(
    "Korean Won currency",
    koreanChannel.currency_code,
    "KRW",
  );
  TestValidator.equals("Korean language", koreanChannel.language, "ko");
  TestValidator.equals("Seoul timezone", koreanChannel.time_zone, "Asia/Seoul");
  TestValidator.equals(
    "Korean market name updated",
    koreanChannel.name,
    `${initialChannel.name} - 한국 시장`,
  );

  // Test 4: Premium market configuration (GBP + English + higher commission)
  const premiumMarket = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: koreanChannel.code,
      body: {
        id: koreanChannel.id,
        currency_code: "GBP",
        language: "en",
        time_zone: "Europe/London",
        commission_rate: 8.5, // Premium UK market rate
        is_active: true,
        description: "Premium UK marketplace with high-quality sellers",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(premiumMarket);

  TestValidator.equals(
    "British Pound currency",
    premiumMarket.currency_code,
    "GBP",
  );
  TestValidator.equals(
    "London timezone",
    premiumMarket.time_zone,
    "Europe/London",
  );
  TestValidator.equals(
    "Premium commission rate",
    premiumMarket.commission_rate,
    8.5,
  );
  TestValidator.predicate(
    "Market remains active",
    premiumMarket.is_active === true,
  );

  // Test 5: Chinese market with multiple regional considerations
  const chineseMarket = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: premiumMarket.code,
      body: {
        id: premiumMarket.id,
        currency_code: "CNY",
        language: "zh",
        time_zone: "Asia/Shanghai",
        commission_rate: 2.5, // Highly competitive Chinese market
        name: `${initialChannel.name} - 中国市场`,
        description: "面向中国消费者的优质购物平台",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(chineseMarket);

  TestValidator.equals(
    "Chinese Yuan currency",
    chineseMarket.currency_code,
    "CNY",
  );
  TestValidator.equals("Chinese language", chineseMarket.language, "zh");
  TestValidator.equals(
    "Shanghai timezone",
    chineseMarket.time_zone,
    "Asia/Shanghai",
  );
  TestValidator.equals(
    "Competitive Chinese market rate",
    chineseMarket.commission_rate,
    2.5,
  );

  // Test 6: Reactivate market with comprehensive parameter updates
  const reactivationUpdate = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: chineseMarket.code,
      body: {
        id: chineseMarket.id,
        code: `${RandomGenerator.alphaNumeric(6)}-reactivated`,
        name: `${initialChannel.name} - International Premium`,
        currency_code: "USD",
        language: "en",
        description:
          "Reactivated international marketplace with optimal settings",
        is_active: true,
        commission_rate: 5.5,
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(reactivationUpdate);

  TestValidator.equals(
    "Reactivated with USD currency",
    reactivationUpdate.currency_code,
    "USD",
  );
  TestValidator.equals(
    "English international language",
    reactivationUpdate.language,
    "en",
  );
  TestValidator.equals(
    "Code updated for reactivation",
    reactivationUpdate.code,
    `${initialChannel.code}-reactivated`,
  );
  TestValidator.equals(
    "Premium commission rate",
    reactivationUpdate.commission_rate,
    5.5,
  );
  TestValidator.predicate(
    "Channel remains active",
    reactivationUpdate.is_active === true,
  );

  // Test 7: Error handling for invalid currency code (should fail gracefully)
  await TestValidator.error(
    "Invalid currency code should fail with business validation",
    async () => {
      await api.functional.shoppingMall.channels.update(connection, {
        channelCode: reactivationUpdate.code,
        body: {
          id: reactivationUpdate.id,
          currency_code: "XXX", // Invalid currency code
          language: "en",
        } satisfies IShoppingMallChannel.IUpdate,
      });
    },
  );

  // Test 8: Sequential validation of all configuration changes
  const finalChannel = await api.functional.shoppingMall.channels.update(
    connection,
    {
      channelCode: reactivationUpdate.code,
      body: {
        id: reactivationUpdate.id,
        currency_code: "EUR",
        language: "fr", // French for European market
        time_zone: "Europe/Paris",
        commission_rate: 6.0,
        name: `${initialChannel.name} - Marché Européen`,
        description: "Marché européen premium avec support multilingue",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(finalChannel);

  TestValidator.equals("Final EUR currency", finalChannel.currency_code, "EUR");
  TestValidator.equals(
    "French language for Europe",
    finalChannel.language,
    "fr",
  );
  TestValidator.equals(
    "Paris timezone",
    finalChannel.time_zone,
    "Europe/Paris",
  );
  TestValidator.equals(
    "European market commission",
    finalChannel.commission_rate,
    6.0,
  );
  TestValidator.equals(
    "French market name",
    finalChannel.name,
    `${initialChannel.name} - Marché Européen`,
  );

  // Validate channel identity preservation throughout all updates
  TestValidator.equals(
    "Channel ID remains constant",
    finalChannel.id,
    initialChannel.id,
  );
  TestValidator.equals(
    "Created timestamp preserved",
    finalChannel.created_at,
    initialChannel.created_at,
  );
  TestValidator.predicate(
    "Updated timestamp reflects changes",
    new Date(finalChannel.updated_at) > new Date(initialChannel.updated_at),
  );
}
