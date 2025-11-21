import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test successful creation of a standard marketplace channel with all required
 * configuration parameters.
 *
 * This comprehensive test validates the complete channel lifecycle from
 * creation through operational readiness. It ensures commission rates, currency
 * codes, language settings, and operational parameters are properly configured.
 * The test verifies code uniqueness enforcement, name validation, and timezone
 * specifications. It also confirms all associated metadata is correctly stored
 * and the channel is ready for marketplace operations.
 *
 * Test flow:
 *
 * 1. Create channel with comprehensive configuration including all required
 *    parameters
 * 2. Validate the response contains all expected properties with correct data
 *    types
 * 3. Verify commission rate boundaries and business logic constraints
 * 4. Test code uniqueness by attempting duplicate channel creation
 * 5. Validate timezone and language settings are properly applied
 * 6. Confirm the channel is created with correct operational status
 */
export async function test_api_channel_creation_standard(
  connection: api.IConnection,
) {
  // Generate valid channel configuration with all required parameters
  const channelCode = RandomGenerator.alphaNumeric(10);
  const channelName = RandomGenerator.name(2);
  const commissionRate = typia.random<
    number & tags.Minimum<0> & tags.Maximum<100>
  >();
  const currencyCode = RandomGenerator.pick([
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "KRW",
  ] as const);
  const language = RandomGenerator.pick([
    "en",
    "ko",
    "ja",
    "zh",
    "es",
    "fr",
  ] as const);
  const timeZone = "Asia/Seoul";
  const description = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  // Create channel with complete configuration
  const createRequest = {
    code: channelCode,
    name: channelName,
    description,
    currency_code: currencyCode,
    language,
    time_zone: timeZone,
    commission_rate: commissionRate,
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: createRequest,
    },
  );
  typia.assert(createdChannel);

  // Validate all response properties match input and have correct types
  TestValidator.equals(
    "channel code matches",
    createdChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    channelName,
  );
  TestValidator.equals(
    "description matches",
    createdChannel.description,
    description,
  );
  TestValidator.equals(
    "currency code matches",
    createdChannel.currency_code,
    currencyCode,
  );
  TestValidator.equals("language matches", createdChannel.language, language);
  TestValidator.equals(
    "time zone matches",
    createdChannel.time_zone ?? null,
    timeZone,
  );
  TestValidator.equals(
    "commission rate matches",
    createdChannel.commission_rate,
    commissionRate,
  );
  TestValidator.predicate(
    "channel is active by default",
    createdChannel.is_active === true,
  );
  TestValidator.predicate(
    "has valid UUID",
    typia.is<string & tags.Format<"uuid">>(createdChannel.id),
  );
  TestValidator.predicate(
    "has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(createdChannel.created_at),
  );
  TestValidator.predicate(
    "has update timestamp",
    typia.is<string & tags.Format<"date-time">>(createdChannel.updated_at),
  );

  // Test code uniqueness enforcement
  await TestValidator.error("duplicate channel code should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.name(2),
        currency_code: "USD",
        language: "en",
        commission_rate: 5,
      } satisfies IShoppingMallChannel.ICreate,
    });
  });

  // Test commission rate boundary validation
  await TestValidator.error(
    "negative commission rate should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          currency_code: "USD",
          language: "en",
          commission_rate: -1,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  await TestValidator.error(
    "commission rate over 100 should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          currency_code: "USD",
          language: "en",
          commission_rate: 101,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test name validation
  await TestValidator.error("empty channel name should fail", async () => {
    await api.functional.shoppingMall.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: "",
        currency_code: "USD",
        language: "en",
        commission_rate: 10,
      } satisfies IShoppingMallChannel.ICreate,
    });
  });

  // Test currency code validation
  await TestValidator.error(
    "invalid currency code length should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          currency_code: "INVALID",
          language: "en",
          commission_rate: 10,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test language validation
  await TestValidator.error(
    "invalid language code length should fail",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(2),
          currency_code: "USD",
          language: "invalid-language-code",
          commission_rate: 10,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Create another channel to verify operational capability
  const secondChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        currency_code: "EUR",
        language: "fr",
        commission_rate: 15,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        time_zone: "Europe/Paris",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(secondChannel);

  TestValidator.predicate(
    "second channel has unique ID",
    secondChannel.id !== createdChannel.id,
  );
  TestValidator.equals(
    "second channel currency",
    secondChannel.currency_code,
    "EUR",
  );
  TestValidator.equals("second channel language", secondChannel.language, "fr");
  TestValidator.equals(
    "second channel timezone",
    secondChannel.time_zone ?? null,
    "Europe/Paris",
  );
}
