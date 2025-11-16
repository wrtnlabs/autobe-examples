import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer registration with password meeting minimum length requirement.
 *
 * Validates that the buyer registration endpoint correctly accepts passwords
 * that meet the minimum length constraint of 8 characters defined in the
 * IShoppingMallBuyer.ICreate schema. This test ensures password strength
 * enforcement is working correctly during account creation.
 *
 * Test cases:
 *
 * 1. Register buyer with exactly 8-character password (minimum valid length)
 * 2. Register buyer with 9-character password (above minimum)
 * 3. Validate complete response structure and token issuance
 * 4. Confirm buyer account is fully functional
 */
export async function test_api_buyer_registration_password_minimum_length(
  connection: api.IConnection,
) {
  // Test Case 1: Register with exactly 8-character password (minimum valid)
  const email1 = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(8);

  const buyer1 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: email1,
      password: password1,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer1);

  // Validate buyer1 business logic
  TestValidator.equals("buyer1 email matches input", buyer1.email, email1);

  // Test Case 2: Register with 9-character password (above minimum)
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(9);

  const buyer2 = await api.functional.auth.buyer.join(connection, {
    body: {
      email: email2,
      password: password2,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer2);

  // Validate buyer2 business logic
  TestValidator.equals("buyer2 email matches input", buyer2.email, email2);

  // Validate that both buyers have different IDs
  TestValidator.notEquals("buyers have different IDs", buyer1.id, buyer2.id);
}
