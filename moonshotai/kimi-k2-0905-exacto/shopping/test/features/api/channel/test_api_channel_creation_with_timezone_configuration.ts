import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test marketplace channel creation with timezone configuration for regional
 * operation scheduling and time-sensitive functionality.
 *
 * This test validates comprehensive channel creation with timezone-aware
 * settings, including:
 *
 * 1. Channel creation with proper timezone configuration for regional operations
 * 2. Currency and language localization for different market regions
 * 3. Commission rate configuration affecting seller economics and platform revenue
 * 4. Channel lifecycle management with active/inactive states
 * 5. Time zone specification supporting global market operations
 * 6. Business rule validation ensuring proper commission rate boundaries
 * 7. Unique channel code and name requirements across the platform
 * 8. Comprehensive configuration validation for multi-marketplace strategies
 *
 * The test ensures channels can operate independently with different
 * configurations while maintaining unified platform infrastructure and customer
 * accounts across various market segments and geographic regions.
 */
export async function test_api_channel_creation_with_timezone_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create channel with timezone configuration for regional operations
  const createRequestBody = {
    code: `channel_${RandomGenerator.alphaNumeric(8)}`, // Unique URL-safe identifier
    name: `${RandomGenerator.name(2)} Marketplace Region`, // Human-readable channel name
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 8,
      wordMax: 12,
    }), // Detailed channel purpose
    currency_code: RandomGenerator.pick([
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "KRW",
    ] as const), // Primary transaction currency
    language: RandomGenerator.pick(["en", "ko", "ja", "zh", "es"] as const), // Interface localization language
    time_zone: "America/New_York", // Regional timezone for scheduling operations
    commission_rate: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(), // Platform commission rate
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: createRequestBody,
    },
  );
  typia.assert(createdChannel);

  // Step 2: Validate channel properties match creation request
  TestValidator.equals(
    "channel code matches request",
    createdChannel.code,
    createRequestBody.code,
  );
  TestValidator.equals(
    "channel name matches request",
    createdChannel.name,
    createRequestBody.name,
  );
  TestValidator.equals(
    "channel description matches request",
    createdChannel.description,
    createRequestBody.description,
  );
  TestValidator.equals(
    "channel currency code matches request",
    createdChannel.currency_code,
    createRequestBody.currency_code,
  );
  TestValidator.equals(
    "channel language matches request",
    createdChannel.language,
    createRequestBody.language,
  );
  TestValidator.equals(
    "channel timezone matches request",
    createdChannel.time_zone,
    createRequestBody.time_zone,
  );
  TestValidator.equals(
    "channel commission rate matches request",
    createdChannel.commission_rate,
    createRequestBody.commission_rate,
  );

  // Step 3: Verify channel is created in active state by default
  TestValidator.predicate(
    "channel is active by default",
    createdChannel.is_active === true,
  );

  // Step 4: Create additional channels for multi-marketplace testing with different timezones
  const additionalTimezones = [
    {
      currency: "EUR",
      language: "de",
      timezone: "Europe/Berlin",
      region: "Europe",
    },
    {
      currency: "JPY",
      language: "ja",
      timezone: "Asia/Tokyo",
      region: "Asia-Pacific",
    },
    {
      currency: "GBP",
      language: "en",
      timezone: "Europe/London",
      region: "UK",
    },
  ];

  await ArrayUtil.asyncForEach(additionalTimezones, async (config) => {
    const regionChannelBody = {
      code: `${config.region.toLowerCase()}_${RandomGenerator.alphaNumeric(6)}`,
      name: `${config.region} Marketplace`,
      description: `${config.region} regional marketplace with ${config.currency} currency and local timezone support`,
      currency_code: config.currency,
      language: config.language,
      time_zone: config.timezone,
      commission_rate: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<50>
      >(), // Different commission rates by region
    } satisfies IShoppingMallChannel.ICreate;

    const regionChannel = await api.functional.shoppingMall.channels.create(
      connection,
      {
        body: regionChannelBody,
      },
    );
    typia.assert(regionChannel);

    // Validate timezone functionality for each regional channel
    TestValidator.equals(
      "regional channel timezone",
      regionChannel.time_zone,
      config.timezone,
    );
    TestValidator.equals(
      "regional channel currency",
      regionChannel.currency_code,
      config.currency,
    );
    TestValidator.equals(
      "regional channel language",
      regionChannel.language,
      config.language,
    );
  });

  // Step 5: Test error scenarios for unique code and name constraints
  await await TestValidator.error(
    "duplicate channel code should fail",
    async () => {
      const duplicateCodeBody = {
        code: createRequestBody.code, // Same code as first channel
        name: "Duplicate Code Test Channel",
        currency_code: "USD",
        language: "en",
        commission_rate: 5.0,
      } satisfies IShoppingMallChannel.ICreate;

      await api.functional.shoppingMall.channels.create(connection, {
        body: duplicateCodeBody,
      });
    },
  );

  // Step 6: Test commission rate boundary validation
  await await TestValidator.error(
    "negative commission rate should fail",
    async () => {
      const invalidRateBody = {
        code: `invalid_commission_${RandomGenerator.alphaNumeric(5)}`,
        name: "Invalid Commission Test",
        currency_code: "USD",
        language: "en",
        commission_rate: -10.0, // Negative commission rate
      } satisfies IShoppingMallChannel.ICreate;

      await api.functional.shoppingMall.channels.create(connection, {
        body: invalidRateBody,
      });
    },
  );

  await await TestValidator.error(
    "excessive commission rate should fail",
    async () => {
      const highRateBody = {
        code: `high_commission_${RandomGenerator.alphaNumeric(5)}`,
        name: "High Commission Test",
        currency_code: "USD",
        language: "en",
        commission_rate: 150.0, // Commission rate exceeding 100% limit
      } satisfies IShoppingMallChannel.ICreate;

      await api.functional.shoppingMall.channels.create(connection, {
        body: highRateBody,
      });
    },
  );

  // Step 7: Test optional description field behavior (null and undefined cases)
  const channelWithoutDescription =
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: `nodesc_${RandomGenerator.alphaNumeric(7)}`,
        name: "Channel Without Description",
        currency_code: "USD",
        language: "en",
        commission_rate: 7.5,
        time_zone: null, // Explicitly set to null
        description: undefined, // Explicitly omit description
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channelWithoutDescription);

  TestValidator.predicate(
    "channel without description has null time zone",
    channelWithoutDescription.time_zone === null,
  );
  TestValidator.predicate(
    "channel without description has undefined description",
    channelWithoutDescription.description === undefined,
  );

  // Step 8: Validate timestamp properties are properly generated
  TestValidator.predicate(
    "channel created_at is valid date format",
    typeof createdChannel.created_at === "string" &&
      createdChannel.created_at.length > 0,
  );
  TestValidator.predicate(
    "channel updated_at is valid date format",
    typeof createdChannel.updated_at === "string" &&
      createdChannel.updated_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at follows ISO datetime format",
    createdChannel.updated_at.includes("T") &&
      createdChannel.updated_at.includes("Z"),
  );

  // Step 9: Test timezone validation with valid timezone formats
  const utcChannelBody = {
    code: `utc_${RandomGenerator.alphaNumeric(8)}`,
    name: "UTC Global Channel",
    description:
      "Global marketplace operating in UTC timezone for international coordination",
    currency_code: "USD",
    language: "en",
    time_zone: "UTC", // UTC timezone
    commission_rate: 12.5,
  } satisfies IShoppingMallChannel.ICreate;

  const utcChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: utcChannelBody,
    },
  );
  typia.assert(utcChannel);

  TestValidator.equals("UTC channel timezone", utcChannel.time_zone, "UTC");
  TestValidator.equals(
    "UTC channel properties match request",
    utcChannel.code,
    utcChannelBody.code,
  );
  TestValidator.equals(
    "UTC channel commission rate",
    utcChannel.commission_rate,
    utcChannelBody.commission_rate,
  );
}
