import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test deletion attempts for non-existent promotions to ensure proper error
 * handling.
 *
 * This test validates that the promotion deletion endpoint correctly rejects
 * attempts to delete promotions that don't exist in the system. It tests
 * various invalid promotion name formats including empty strings, malformed
 * names, and randomly generated names that don't match any existing
 * promotions.
 */
export async function test_api_promotion_deletion_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({
        promotions: ["read", "write", "delete"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test various invalid promotion name scenarios
  const invalidPromotionNames = [
    "", // Empty string
    "invalid-promotion-name", // Non-existent promotion
    RandomGenerator.alphaNumeric(20), // Random alphanumeric
    "promotion with spaces", // Name with spaces
    "promotion@special#chars", // Special characters
    "very-long-promotion-name-that-exceeds-typical-length-limits-and-should-fail-validation", // Excessive length
  ] as const;

  // Test each invalid promotion name
  for (const promotionName of invalidPromotionNames) {
    await TestValidator.error(
      `deletion should fail for promotion name: "${promotionName}"`,
      async () => {
        await api.functional.shoppingMall.admin.promotions.erase(connection, {
          promotionName: promotionName,
        });
      },
    );
  }

  // Step 3: Test additional edge cases
  const edgeCases = [
    "null", // String "null"
    "undefined", // String "undefined"
    "0", // Numeric string
    "true", // Boolean string
    "false", // Boolean string
  ] as const;

  for (const edgeCase of edgeCases) {
    await TestValidator.error(
      `deletion should fail for edge case: "${edgeCase}"`,
      async () => {
        await api.functional.shoppingMall.admin.promotions.erase(connection, {
          promotionName: edgeCase,
        });
      },
    );
  }

  // Step 4: Test with numeric and special pattern names
  const patternNames = [
    "123456789", // Pure numeric
    "promotion-123", // Alphanumeric with dash
    "promotion_456", // Alphanumeric with underscore
    "PromotionName", // Mixed case
    "promotion.name", // With dot
  ] as const;

  for (const patternName of patternNames) {
    await TestValidator.error(
      `deletion should fail for pattern name: "${patternName}"`,
      async () => {
        await api.functional.shoppingMall.admin.promotions.erase(connection, {
          promotionName: patternName,
        });
      },
    );
  }
}
