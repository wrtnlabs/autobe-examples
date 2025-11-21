import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test creation attempts with incomplete or missing configuration data to
 * validate input validation robustness
 *
 * Tests scenarios focusing on business logic validation with properly typed
 * data:
 *
 * - Commission rate boundary validation (values > 100%)
 * - Currency code and language format validation
 * - Basic successful creation to ensure validation framework works
 *
 * Verifies that API handles boundary conditions and format requirements
 * appropriately with meaningful business validation error responses.
 */
export async function test_api_channel_creation_incomplete_data(
  connection: api.IConnection,
) {
  // Test 1: Commission rate exceeding maximum boundary (>100)
  await TestValidator.error(
    "channel creation should fail with commission_rate greater than 100",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          currency_code: "USD",
          language: "en",
          commission_rate: 150,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 2: Commission rate negative boundary validation
  await TestValidator.error(
    "channel creation should fail with negative commission_rate",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          currency_code: "USD",
          language: "en",
          commission_rate: -10,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 3: Currency code format validation - too short (2 characters)
  await TestValidator.error(
    "channel creation should fail with invalid currency_code format",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          currency_code: "US", // 2 characters instead of required 3
          language: "en",
          commission_rate: 5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 4: Currency code format validation - too long (4 characters)
  await TestValidator.error(
    "channel creation should fail with currency_code exceeding maximum length",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          currency_code: "USDD", // 4 characters instead of required 3
          language: "en",
          commission_rate: 5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 5: Language code format validation - too long
  await TestValidator.error(
    "channel creation should fail with invalid language code format",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          currency_code: "USD",
          language: "english-language-code", // Too long, exceeds max length
          commission_rate: 5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 6: Channel code minimum length validation
  await TestValidator.error(
    "channel creation should fail with empty code field",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: "", // Empty code - violates minimum length of 1
          name: RandomGenerator.name(),
          currency_code: "USD",
          language: "en",
          commission_rate: 5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 7: Channel name minimum length validation
  await TestValidator.error(
    "channel creation should fail with empty name field",
    async () => {
      await api.functional.shoppingMall.channels.create(connection, {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: "", // Empty name - violates minimum length of 1
          currency_code: "USD",
          language: "en",
          commission_rate: 5,
        } satisfies IShoppingMallChannel.ICreate,
      });
    },
  );

  // Test 8: Successful channel creation with valid complete data
  const validChannel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        currency_code: "USD",
        language: "en",
        commission_rate: 5.5,
        time_zone: "America/New_York",
      } satisfies IShoppingMallChannel.ICreate,
    },
  );

  typia.assert(validChannel);

  // Validate the created channel has all expected properties
  TestValidator.predicate(
    "created channel should have all required properties",
    validChannel.code !== undefined &&
      validChannel.name !== undefined &&
      validChannel.currency_code !== undefined &&
      validChannel.language !== undefined &&
      validChannel.commission_rate !== undefined,
  );

  // Validate commission rate is within valid range
  TestValidator.predicate(
    "commission rate should be within valid range",
    validChannel.commission_rate >= 0 && validChannel.commission_rate <= 100,
  );

  // Validate currency code format (3 characters)
  TestValidator.predicate(
    "currency code should be 3 characters",
    validChannel.currency_code.length === 3,
  );

  // Validate that created_at and updated_at timestamps are generated
  TestValidator.predicate(
    "channel should have creation and update timestamps",
    validChannel.created_at !== undefined &&
      validChannel.updated_at !== undefined,
  );
}
