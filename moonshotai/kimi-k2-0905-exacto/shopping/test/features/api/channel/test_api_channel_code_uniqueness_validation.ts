import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel code uniqueness validation including duplicate code rejection,
 * case sensitivity handling, and business identifier consistency.
 *
 * This test validates marketplace navigation and business logic including
 * proper error handling for conflicting channel identifiers and URL-safe naming
 * convention enforcement within multi-channel shopping mall platform
 * environments through iterative channel creation operations.
 *
 * The test covers:
 *
 * 1. Successful channel creation with unique code
 * 2. Duplicate channel code rejection (exact match)
 * 3. Case sensitivity validation (same code with different cases)
 * 4. Variations with numbers and hyphens
 * 5. URL-safe naming convention compliance
 * 6. Business identifier consistency validation
 * 7. Error handling for conflicting identifiers
 */
export async function test_api_channel_code_uniqueness_validation(
  connection: api.IConnection,
) {
  // Generate test channel data
  const channelCode = "TEST-CHANNEL";
  const channelName = RandomGenerator.name();

  // Create first channel with unique code
  const channelData = {
    code: channelCode,
    name: channelName,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    currency_code: "USD",
    language: "en",
    time_zone: "UTC",
    commission_rate: typia.random<
      number & tags.Minimum<0> & tags.Maximum<20>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  const firstChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: channelData,
    },
  );
  typia.assert(firstChannel);

  // Validate first channel creation
  TestValidator.equals(
    "first channel code matches input",
    firstChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "first channel name matches input",
    firstChannel.name,
    channelName,
  );

  // Test 1: Attempt to create channel with exact same code (should fail)
  await TestValidator.error(
    "duplicate channel code should be rejected",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: channelCode,
          name: RandomGenerator.name(),
          currency_code: "USD",
          language: "en",
          commission_rate: 10.5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 2: Case sensitivity - create with same code but different case
  const sameCodeDifferentCase =
    channelCode.toLowerCase() === channelCode
      ? channelCode.toUpperCase()
      : channelCode.toLowerCase();

  const secondChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: sameCodeDifferentCase,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 3,
          wordMax: 6,
        }),
        currency_code: "EUR",
        language: "de",
        time_zone: "Europe/Berlin",
        commission_rate: typia.random<
          number & tags.Minimum<5> & tags.Maximum<25>
        >(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(secondChannel);

  TestValidator.equals(
    "case-sensitive code works",
    secondChannel.code,
    sameCodeDifferentCase,
  );
  TestValidator.notEquals(
    "channels have different IDs despite similar codes",
    firstChannel.id,
    secondChannel.id,
  );

  // Test 3: Variations with numbers and hyphens
  const variations = ArrayUtil.repeat(
    3,
    (i) =>
      ({
        code: `${channelCode}-${i + 1}`,
        name: `${RandomGenerator.name()} ${i + 1}`,
        currency_code: RandomGenerator.pick(["USD", "EUR", "GBP"] as const),
        language: RandomGenerator.pick(["en", "es", "fr", "de"] as const),
        commission_rate: typia.random<
          number & tags.Minimum<0> & tags.Maximum<30>
        >(),
      }) satisfies IShoppingMallChannel.ICreate,
  );

  const variedChannels = await ArrayUtil.asyncMap(variations, async (data) => {
    return await api.functional.shoppingMall.channels.create(connection, {
      body: data satisfies IShoppingMallChannel.ICreate,
    });
  });

  variedChannels.forEach((channel, i) => {
    typia.assert(channel);
    TestValidator.equals(
      `variant channel ${i} code matches`,
      channel.code,
      variations[i].code,
    );
  });

  // Test 4: URL-safe naming conventions
  const urlSafeCodes = [
    "alphanumeric-code-123",
    "mixed_case-Test-456",
    "spaces-and-dashes-example",
    "numbers-at-start-789",
    "complex-name_with-many-parts",
  ];

  const urlSafeChannels = await ArrayUtil.asyncMap(
    urlSafeCodes,
    async (urlSafeCode) => {
      const channelData = {
        code: urlSafeCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        currency_code: "JPY",
        language: "ja",
        commission_rate: 15,
      } satisfies IShoppingMallChannel.ICreate;

      return await api.functional.shoppingMall.channels.create(connection, {
        body: channelData,
      });
    },
  );

  urlSafeChannels.forEach((channel, i) => {
    typia.assert(channel);
    TestValidator.predicate(
      `URL-safe channel ${i} code matches input`,
      channel.code === urlSafeCodes[i],
    );
    TestValidator.predicate(
      `URL-safe channel ${i} name is set`,
      typeof channel.name === "string" && channel.name.length > 0,
    );
    TestValidator.predicate(
      `URL-safe channel ${i} currency is JPY`,
      channel.currency_code === "JPY",
    );
  });

  // Final validation: Business identifier consistency
  TestValidator.predicate(
    "all created channels have unique IDs despite varying codes",
    [firstChannel, secondChannel, ...variedChannels, ...urlSafeChannels].every(
      (channel, i, channels) => {
        return channels.filter((c) => c.id === channel.id).length === 1;
      },
    ),
  );

  TestValidator.predicate(
    "all channel codes maintain their input values exactly",
    [
      firstChannel.code,
      secondChannel.code,
      ...variedChannels.map((c) => c.code),
      ...urlSafeChannels.map((c) => c.code),
    ].every((code, i, codes) => {
      if (i === 0) return code === channelCode;
      if (i === 1) return code === sameCodeDifferentCase;
      if (i >= 2 && i <= 4) {
        const variationIndex = i - 2;
        return code === `${channelCode}-${variationIndex + 1}`;
      }
      const urlSafeIndex = i - 5;
      return code === urlSafeCodes[urlSafeIndex];
    }),
  );
}
