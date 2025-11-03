import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test permanent deletion of an attribute value by an admin
 *
 * This test validates the business logic for attribute value deletion by an
 * authenticated admin. Scenarios covered:
 *
 * 1. Register and authenticate an admin (using random unique credentials).
 * 2. Attempt deletion of a fresh (random) dimensionCode/valueCode pair: should
 *    succeed as value is not assigned to any SKU (by assumption).
 * 3. Attempt to delete the same value again: should fail with constraint violation
 *    as the value is already deleted (simulated constraint proxy).
 * 4. Business logic such as audit log verification and SKU constraint coverage is
 *    acknowledged but not implemented due to unavailable endpoints.
 */
export async function test_api_attribute_value_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      role: "super",
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Generate unique random codes for dimension/value to avoid conflicts
  const dimensionCode = RandomGenerator.alphaNumeric(12);
  const valueCode = RandomGenerator.alphaNumeric(14);

  // 3. Attempt deletion (should succeed, value not linked to SKUs)
  await api.functional.shopping.admin.attributeDimensions.values.erase(
    connection,
    {
      dimensionCode,
      valueCode,
    },
  );

  // 4. Attempt to delete again (should raise constraint/business error)
  await TestValidator.error(
    "Deleting a non-existent or already deleted attribute value should fail",
    async () => {
      await api.functional.shopping.admin.attributeDimensions.values.erase(
        connection,
        {
          dimensionCode,
          valueCode,
        },
      );
    },
  );

  // NOTE: No available endpoint/API to create attribute values, link/unlink SKUs or verify audit/logging.
  // Edge case where deletion is attempted after unlink is not testable due to missing supporting APIs.
}
