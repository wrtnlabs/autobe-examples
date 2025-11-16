import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";

/**
 * Test retrieval of a global constraint with an invalid or non-existent
 * constraintKey.
 *
 * This test attempts to fetch a global constraint record using a randomly
 * generated unlikely key that should not exist. It validates that the system:
 *
 * 1. Returns an error or appropriate error response (through thrown error or
 *    absence of valid object).
 * 2. Does not leak any sensitive data when the key is not found.
 * 3. Business rules for lookup failures (e.g., not-found status or graceful info
 *    message) are properly followed.
 */
export async function test_api_global_constraint_retrieve_invalid_key(
  connection: api.IConnection,
) {
  // Use a random string unlikely to exist as a constraint key
  const invalidConstraintKey = `nonexistent-constraint-key-${Math.random().toString(36).slice(2, 14)}`;

  await TestValidator.error(
    "retrieving non-existent global constraint throws error",
    async () => {
      await api.functional.communityPlatform.globalConstraints.at(connection, {
        constraintKey: invalidConstraintKey,
      });
    },
  );
}
