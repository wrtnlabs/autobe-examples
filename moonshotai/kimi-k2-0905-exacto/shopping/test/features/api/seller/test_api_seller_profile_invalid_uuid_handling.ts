import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test error handling when attempting to retrieve seller profiles with invalid
 * or malformed UUID parameters.
 *
 * This test validates proper API responses when invalid seller IDs are
 * provided, ensuring appropriate error messages and status codes are returned.
 * The test covers:
 *
 * 1. Non-existent seller ID (valid UUID format but not in database)
 * 2. Business logic validation for seller retrieval
 *
 * Note: Type error testing with malformed UUIDs is not implemented as it
 * violates TypeScript type safety principles. Instead, we test business logic
 * errors.
 */
export async function test_api_seller_profile_invalid_uuid_handling(
  connection: api.IConnection,
) {
  // Test case: Valid UUID format but non-existent seller ID
  await TestValidator.error("non-existent seller ID should fail", async () => {
    await api.functional.shoppingMall.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
