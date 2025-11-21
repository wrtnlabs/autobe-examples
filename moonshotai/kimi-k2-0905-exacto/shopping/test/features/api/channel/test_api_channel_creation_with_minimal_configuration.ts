import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test marketplace channel creation using minimal required configuration.
 *
 * This test validates the creation of a marketplace channel with only essential
 * business parameters, focusing on streamlined configuration for efficient
 * marketplace setup. It verifies that the system accepts minimal required
 * configurations while ensuring proper data validation and response structure.
 *
 * The test covers:
 *
 * 1. Generation of minimal channel configuration with unique code and basic
 *    properties
 * 2. API call for channel creation with core business parameters
 * 3. Validation of commission rate constraints (0-100%)
 * 4. Response data integrity checking including timestamp generation
 * 5. Ensuring required fields like currency_code, language follow proper formats
 *
 * Business context validates that platform economics are set up correctly with
 * appropriate commission structures while maintaining minimal configuration
 * overhead.
 */
export async function test_api_channel_creation_with_minimal_configuration(
  connection: api.IConnection,
) {
  // Generate minimal channel configuration with essential properties
  const channelCode = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const channelName = RandomGenerator.name();

  // Create basic commission structure with reasonable rate
  const commissionRate = typia.random<
    number & tags.Minimum<0> & tags.Maximum<100>
  >();

  // Ensure currency code follows ISO 4217 format
  const currencyCode = RandomGenerator.pick(["USD", "EUR", "KRW"]) as string &
    tags.MinLength<3> &
    tags.MaxLength<3>;

  // Select primary language for channel
  const language = RandomGenerator.pick(["en", "ko", "ja", "zh"]) as string &
    tags.MinLength<2> &
    tags.MaxLength<10>;

  // Build minimal configuration body focusing on core business requirements
  const requestBody = {
    code: channelCode,
    name: channelName,
    currency_code: currencyCode,
    language: language,
    commission_rate: commissionRate,
  } satisfies IShoppingMallChannel.ICreate;

  // Create channel with minimal configuration
  const createdChannel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: requestBody,
    });

  // Validate response data integrity
  typia.assert(createdChannel);

  // Verify core business parameters match request
  TestValidator.equals(
    "channel code should match",
    createdChannel.code,
    requestBody.code,
  );
  TestValidator.equals(
    "channel name should match",
    createdChannel.name,
    requestBody.name,
  );
  TestValidator.equals(
    "currency code should match",
    createdChannel.currency_code,
    requestBody.currency_code,
  );
  TestValidator.equals(
    "language should match",
    createdChannel.language,
    requestBody.language,
  );
  TestValidator.equals(
    "commission rate should match",
    createdChannel.commission_rate,
    requestBody.commission_rate,
  );

  // Validate business logic constraints
  TestValidator.predicate(
    "commission rate should be within valid range",
    createdChannel.commission_rate >= 0 &&
      createdChannel.commission_rate <= 100,
  );
  TestValidator.predicate(
    "currency code should have correct length",
    createdChannel.currency_code.length === 3,
  );
  TestValidator.predicate(
    "language code should have valid length",
    createdChannel.language.length >= 2 && createdChannel.language.length <= 10,
  );

  // Verify system-generated mandatory fields
  TestValidator.predicate(
    "channel should have UUID id",
    createdChannel.id.length === 36,
  ); // Typical UUID length
  TestValidator.predicate(
    "channel should be active by default",
    createdChannel.is_active === true,
  );
  TestValidator.predicate(
    "channel should have created timestamp",
    !!createdChannel.created_at,
  );
  TestValidator.predicate(
    "channel should have updated timestamp",
    !!createdChannel.updated_at,
  );
}
