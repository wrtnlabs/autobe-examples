import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test buyer login with case-insensitive email matching.
 *
 * This test validates that the authentication system performs case-insensitive
 * email matching during buyer login. A buyer account is created with a
 * lowercase email address, then login attempts are made using various email
 * case variations (uppercase, mixed case, lowercase) to ensure all succeed.
 *
 * The test confirms that:
 *
 * 1. Buyer can register with a lowercase email
 * 2. Login succeeds with uppercase email variant
 * 3. Login succeeds with mixed case email variant
 * 4. Login succeeds with original lowercase email
 * 5. All login responses return the email in original registered form
 * 6. Authentication tokens are properly issued for all case variations
 * 7. Buyer ID remains consistent across all login attempts
 */
export async function test_api_buyer_login_case_insensitive_email(
  connection: api.IConnection,
) {
  // Step 1: Generate test data with lowercase email
  const originalEmail = typia
    .random<string & tags.Format<"email">>()
    .toLowerCase();
  const password = typia.random<string & tags.MinLength<8>>();
  const fullName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const testHref = typia.random<string & tags.Format<"uri">>();
  const testReferrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create buyer account with lowercase email
  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: originalEmail,
        password: password,
        full_name: fullName,
        phone_number: phoneNumber,
        href: testHref,
        referrer: testReferrer,
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(registeredBuyer);

  // Validate registration response
  TestValidator.equals(
    "registered email matches original",
    registeredBuyer.email,
    originalEmail,
  );
  TestValidator.equals(
    "full name matches",
    registeredBuyer.full_name,
    fullName,
  );

  // Step 3: Test login with uppercase email
  const uppercaseEmail = originalEmail.toUpperCase();
  const loginUppercase: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: uppercaseEmail,
        password: password,
        href: testHref,
        referrer: testReferrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(loginUppercase);

  // Validate uppercase login
  TestValidator.equals(
    "uppercase login returns same buyer ID",
    loginUppercase.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "uppercase login returns original email casing",
    loginUppercase.email,
    originalEmail,
  );

  // Step 4: Test login with mixed case email (capitalize first letter)
  const mixedCaseEmail =
    originalEmail.charAt(0).toUpperCase() + originalEmail.slice(1);

  const loginMixedCase: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: mixedCaseEmail,
        password: password,
        href: testHref,
        referrer: testReferrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(loginMixedCase);

  // Validate mixed case login
  TestValidator.equals(
    "mixed case login returns same buyer ID",
    loginMixedCase.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "mixed case login returns original email casing",
    loginMixedCase.email,
    originalEmail,
  );

  // Step 5: Test login with original lowercase email
  const loginLowercase: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: originalEmail,
        password: password,
        href: testHref,
        referrer: testReferrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(loginLowercase);

  // Validate lowercase login
  TestValidator.equals(
    "lowercase login returns same buyer ID",
    loginLowercase.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "lowercase login returns original email casing",
    loginLowercase.email,
    originalEmail,
  );
}
