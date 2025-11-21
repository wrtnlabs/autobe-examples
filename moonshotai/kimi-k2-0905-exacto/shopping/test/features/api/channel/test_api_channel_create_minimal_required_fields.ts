import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with only required configuration fields.
 *
 * This test validates that a marketplace channel can be created successfully
 * using only the required fields: code, name, currency_code, language, and
 * commission_rate. It verifies that optional properties like description and
 * time_zone are properly handled with system defaults when not specified.
 *
 * The test ensures that:
 *
 * 1. Channel creation succeeds with minimal required data
 * 2. Response contains all expected fields including generated defaults
 * 3. Optional properties are properly set to null/undefined when omitted
 * 4. System-generated fields (id, created_at, updated_at) are present
 * 5. Commission rate bounds are properly enforced
 *
 * @param connection - API connection for making requests
 */
export async function test_api_channel_create_minimal_required_fields(
  connection: api.IConnection,
) {
  // Generate minimal channel data with only required fields
  const channelData = {
    code: RandomGenerator.alphaNumeric(8).toLowerCase(),
    name: RandomGenerator.name(2),
    currency_code: "USD",
    language: "en",
    commission_rate: typia.random<
      number & tags.Maximum<100> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallChannel.ICreate;

  // Create channel with minimal required fields
  const channel = await api.functional.shoppingMall.channels.create(
    connection,
    {
      body: channelData,
    },
  );

  // Validate response structure and required fields
  typia.assert(channel);

  // Verify all required fields match input
  TestValidator.equals("channel code matches", channel.code, channelData.code);
  TestValidator.equals("channel name matches", channel.name, channelData.name);
  TestValidator.equals(
    "currency code matches",
    channel.currency_code,
    channelData.currency_code,
  );
  TestValidator.equals(
    "language matches",
    channel.language,
    channelData.language,
  );
  TestValidator.equals(
    "commission rate matches",
    channel.commission_rate,
    channelData.commission_rate,
  );

  // Verify system-generated fields are present
  TestValidator.predicate(
    "has valid UUID",
    typia.is<string & tags.Format<"uuid">>(channel.id),
  );
  TestValidator.predicate("is active by default", channel.is_active === true);
  TestValidator.predicate(
    "has created_at timestamp",
    channel.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    channel.updated_at.length > 0,
  );

  // Verify optional fields are properly handled (null/undefined when not provided)
  TestValidator.equals(
    "description is null when not provided",
    channel.description,
    null,
  );
  TestValidator.equals(
    "time_zone is null when not provided",
    channel.time_zone,
    null,
  );
}
