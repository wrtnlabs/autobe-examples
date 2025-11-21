import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test channel creation with boundary commission rate values.
 *
 * Validates percentage-based constraints with minimum and maximum commission
 * rate boundaries, ensuring business rule compliance across the platform. This
 * test examines extreme values at both ends of the valid range (0% and 100%)
 * and carefully approaches boundary conditions to ensure the commission_rate
 * field properly enforces the Minimum<0> and Maximum<100> constraints as
 * defined in IShoppingMallChannel.ICreate.
 *
 * Test scenarios include:
 *
 * 1. Minimum commission rate (0%) - should succeed
 * 2. Maximum commission rate (100%) - should succeed
 * 3. Rates near boundaries to ensure proper enforcement
 *
 * The test ensures that the commission_rate field in
 * IShoppingMallChannel.ICreate correctly validates the number type with
 * tags.Minimum<0> and tags.Maximum<100> constraints, maintaining business rule
 * compliance for marketplace operations.
 */
export async function test_api_channel_creation_boundary_commission(
  connection: api.IConnection,
) {
  // Test minimum commission rate (0%)
  const minCommissionBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    currency_code: "USD",
    language: "en",
    commission_rate: 0, // Minimum boundary value
  } satisfies IShoppingMallChannel.ICreate;

  const minCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: minCommissionBody,
    });
  typia.assert(minCommissionChannel);

  TestValidator.equals(
    "minimum commission rate creation",
    minCommissionChannel.commission_rate,
    0,
  );

  // Test maximum commission rate (100%)
  const maxCommissionBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    currency_code: "USD",
    language: "en",
    commission_rate: 100, // Maximum boundary value
  } satisfies IShoppingMallChannel.ICreate;

  const maxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: maxCommissionBody,
    });
  typia.assert(maxCommissionChannel);

  TestValidator.equals(
    "maximum commission rate creation",
    maxCommissionChannel.commission_rate,
    100,
  );

  // Test fractional commission rate near maximum boundary
  const nearMaxCommissionBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    currency_code: "USD",
    language: "en",
    commission_rate: 99.99, // Near maximum boundary
  } satisfies IShoppingMallChannel.ICreate;

  const nearMaxCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: nearMaxCommissionBody,
    });
  typia.assert(nearMaxCommissionChannel);

  TestValidator.equals(
    "near-maximum commission rate creation",
    nearMaxCommissionChannel.commission_rate,
    99.99,
  );

  // Test fractional commission rate near minimum boundary
  const nearMinCommissionBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    currency_code: "USD",
    language: "en",
    commission_rate: 0.01, // Near minimum boundary
  } satisfies IShoppingMallChannel.ICreate;

  const nearMinCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: nearMinCommissionBody,
    });
  typia.assert(nearMinCommissionChannel);

  TestValidator.equals(
    "near-minimum commission rate creation",
    nearMinCommissionChannel.commission_rate,
    0.01,
  );

  // Test with description and timezone
  const detailedCommissionBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency_code: "EUR",
    language: "de",
    time_zone: "Europe/Berlin",
    commission_rate: 15.5, // Mid-range commission rate
  } satisfies IShoppingMallChannel.ICreate;

  const detailedCommissionChannel =
    await api.functional.shoppingMall.channels.create(connection, {
      body: detailedCommissionBody,
    });
  typia.assert(detailedCommissionChannel);

  TestValidator.predicate(
    "detailed commission rate within range",
    detailedCommissionChannel.commission_rate >= 0 &&
      detailedCommissionChannel.commission_rate <= 100,
  );
}
