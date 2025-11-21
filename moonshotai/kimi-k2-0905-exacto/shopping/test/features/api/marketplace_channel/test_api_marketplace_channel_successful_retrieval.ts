import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test successful retrieval of a marketplace channel configuration by its
 * unique channel code. Validates that the API returns complete channel
 * information including commission rates, operational settings, currency,
 * language preferences, and status information. Ensures all required fields are
 * present in the response with proper data types and format validation.
 */
export async function test_api_marketplace_channel_successful_retrieval(
  connection: api.IConnection,
) {
  // Generate a random channel code for testing
  const channelCode = RandomGenerator.alphabets(10);

  // Retrieve channel information using the API
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.channels.at(connection, { channelCode });

  // Validate the response structure and required fields
  typia.assert(channel);

  // Verify all required fields are present with correct data types
  TestValidator.predicate(
    "channel has valid ID format",
    typeof channel.id === "string" && channel.id.length > 0,
  );

  TestValidator.predicate(
    "channel code matches request",
    channel.code === channelCode,
  );

  TestValidator.predicate(
    "channel name is non-empty string",
    typeof channel.name === "string" && channel.name.length > 0,
  );

  TestValidator.predicate(
    "currency code is valid 3-character string",
    typeof channel.currency_code === "string" &&
      channel.currency_code.length === 3,
  );

  TestValidator.predicate(
    "language is valid string",
    typeof channel.language === "string" && channel.language.length >= 2,
  );

  TestValidator.predicate(
    "commission rate is valid number between 0-100",
    typeof channel.commission_rate === "number" &&
      channel.commission_rate >= 0 &&
      channel.commission_rate <= 100,
  );

  TestValidator.predicate(
    "is_active is boolean",
    typeof channel.is_active === "boolean",
  );

  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof channel.created_at === "string" && channel.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof channel.updated_at === "string" && channel.updated_at.length > 0,
  );

  // Validate optional fields if present
  if (channel.description !== null && channel.description !== undefined) {
    TestValidator.predicate(
      "description is valid string when present",
      typeof channel.description === "string",
    );
  }

  if (channel.time_zone !== null && channel.time_zone !== undefined) {
    TestValidator.predicate(
      "time_zone is valid string when present",
      typeof channel.time_zone === "string",
    );
  }

  // Verify temporal consistency - updated_at should be equal to or after created_at
  TestValidator.predicate(
    "updated_at timestamp is valid relative to created_at",
    new Date(channel.updated_at).getTime() >=
      new Date(channel.created_at).getTime(),
  );
}
