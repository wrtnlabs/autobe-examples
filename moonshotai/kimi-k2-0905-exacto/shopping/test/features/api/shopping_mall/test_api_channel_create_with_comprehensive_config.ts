import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test marketplace channel creation with comprehensive configuration
 *
 * This test validates the complete channel creation process including:
 *
 * 1. All required fields: code, name, currency code, language, commission rate
 * 2. Optional timezone settings and detailed description
 * 3. Comprehensive channel policies and operational guidelines
 * 4. Validation of response data structure and business rules
 *
 * The test creates a realistic marketplace channel with full configuration to
 * ensure the API properly handles complete channel setup scenarios.
 */
export async function test_api_channel_create_with_comprehensive_config(
  connection: api.IConnection,
) {
  // Generate comprehensive channel creation data with all required fields
  const channelData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    currency_code: RandomGenerator.pick([
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "KRW",
    ] as const),
    language: RandomGenerator.pick([
      "en",
      "ko",
      "ja",
      "zh",
      "es",
      "fr",
    ] as const),
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<100>
    >(),
    time_zone: RandomGenerator.pick([
      "UTC",
      "America/New_York",
      "Europe/London",
      "Asia/Seoul",
      "Asia/Tokyo",
    ] as const),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallChannel.ICreate;

  // Create the channel with comprehensive configuration
  const createdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: channelData,
    },
  );

  // Validate response structure and business logic
  typia.assert(createdChannel);

  // Verify all required fields are properly returned
  TestValidator.equals(
    "channel code matches",
    createdChannel.code,
    channelData.code,
  );
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    channelData.name,
  );
  TestValidator.equals(
    "currency code matches",
    createdChannel.currency_code,
    channelData.currency_code,
  );
  TestValidator.equals(
    "language matches",
    createdChannel.language,
    channelData.language,
  );
  TestValidator.equals(
    "commission rate matches",
    createdChannel.commission_rate,
    channelData.commission_rate,
  );
  TestValidator.equals(
    "timezone matches",
    createdChannel.time_zone,
    channelData.time_zone,
  );
  TestValidator.equals(
    "description matches",
    createdChannel.description,
    channelData.description,
  );

  // Validate auto-generated fields
  TestValidator.predicate(
    "channel has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdChannel.id),
  );
  TestValidator.predicate(
    "channel is active by default",
    createdChannel.is_active === true,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    typia.is<string & tags.Format<"date-time">>(createdChannel.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    typia.is<string & tags.Format<"date-time">>(createdChannel.updated_at),
  );
  TestValidator.equals(
    "timestamps match",
    createdChannel.created_at,
    createdChannel.updated_at,
  );

  // Test channel code uniqueness constraint
  await TestValidator.error("duplicate channel code should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        ...channelData,
        name: RandomGenerator.name(), // Change name but keep same code
      },
    });
  });

  // Test invalid commission rate ranges
  await TestValidator.error(
    "negative commission rate should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          ...channelData,
          code: RandomGenerator.alphaNumeric(10),
          commission_rate: -5,
        },
      });
    },
  );

  await TestValidator.error(
    "commission rate over 100 should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          ...channelData,
          code: RandomGenerator.alphaNumeric(10),
          commission_rate: 120,
        },
      });
    },
  );

  // Test currency code validation
  await TestValidator.error("invalid currency code should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        ...channelData,
        code: RandomGenerator.alphaNumeric(10),
        currency_code: "INVALID" as any,
      },
    });
  });

  // Test language validation
  await TestValidator.error("invalid language code should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        ...channelData,
        code: RandomGenerator.alphaNumeric(10),
        language: "invalid-lang" as any,
      },
    });
  });
}
