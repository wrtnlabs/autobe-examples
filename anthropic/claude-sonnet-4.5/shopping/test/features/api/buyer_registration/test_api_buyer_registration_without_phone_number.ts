import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer registration without phone number.
 *
 * This test validates that the buyer registration process succeeds when the
 * optional phone_number field is not provided. The shopping_mall_buyers table
 * allows nullable phone numbers, so registration should complete successfully
 * with only the required fields: email, password, full_name, href, and
 * referrer.
 *
 * The test confirms that:
 *
 * 1. Registration succeeds without phone_number
 * 2. All required fields are sufficient for account creation
 * 3. The returned profile shows phone_number as null/undefined
 * 4. Authentication tokens are properly issued
 * 5. The account is fully functional
 *
 * Steps:
 *
 * 1. Generate valid registration data without phone_number
 * 2. Call buyer registration API
 * 3. Validate response structure and data
 * 4. Verify phone_number is null/undefined in response
 * 5. Confirm authentication tokens are present
 * 6. Validate account status is correct
 */
export async function test_api_buyer_registration_without_phone_number(
  connection: api.IConnection,
) {
  // Generate registration data without phone_number
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const full_name = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<100>
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body without phone_number
  const registrationData = {
    email: email,
    password: password,
    full_name: full_name,
    href: href,
    referrer: referrer,
  } satisfies IShoppingMallBuyer.ICreate;

  // Call buyer registration API
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: registrationData,
  });

  // Validate response structure - this validates ALL types including UUID format, timestamps, token structure
  typia.assert(buyer);

  // Verify business logic: input data matches output
  TestValidator.equals("buyer email matches input", buyer.email, email);
  TestValidator.equals(
    "buyer full_name matches input",
    buyer.full_name,
    full_name,
  );

  // Verify phone_number is null or undefined - this is the core test objective
  TestValidator.predicate(
    "phone_number should be null or undefined",
    buyer.phone_number === null || buyer.phone_number === undefined,
  );

  // Verify business logic: email should not be verified initially for new accounts
  TestValidator.equals(
    "email should not be verified initially",
    buyer.email_verified,
    false,
  );

  // Verify business logic: account should be active (not soft-deleted)
  TestValidator.predicate(
    "account should not be deleted",
    buyer.deleted_at === null || buyer.deleted_at === undefined,
  );
}
