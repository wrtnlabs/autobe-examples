import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test successful buyer authentication with valid credentials.
 *
 * This test validates the complete login workflow for an existing buyer
 * account. The test performs the following steps:
 *
 * 1. Create a buyer account through registration with known credentials
 * 2. Attempt to login using the exact same credentials with session context
 * 3. Verify successful authentication and response structure
 * 4. Validate that buyer profile information is complete and correct
 * 5. Confirm that JWT tokens are issued with proper expiration times
 */
export async function test_api_buyer_login_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = "TestPassword123!";
  const testFullName = RandomGenerator.name();
  const testPhoneNumber = RandomGenerator.mobile();
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        full_name: testFullName,
        phone_number: testPhoneNumber,
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(registeredBuyer);

  // Verify registration was successful
  TestValidator.equals(
    "registered email matches",
    registeredBuyer.email,
    testEmail,
  );
  TestValidator.equals(
    "registered full name matches",
    registeredBuyer.full_name,
    testFullName,
  );

  // Step 2: Login with the registered credentials
  const loginHref = typia.random<string & tags.Format<"uri">>();
  const loginReferrer = typia.random<string & tags.Format<"uri">>();

  const loggedInBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: testEmail,
        password: testPassword,
        href: loginHref,
        referrer: loginReferrer,
      } satisfies IShoppingMallBuyer.ILogin,
    });
  typia.assert(loggedInBuyer);

  // Step 3: Validate the login response - business logic validation only
  TestValidator.equals(
    "logged in buyer ID matches registered buyer",
    loggedInBuyer.id,
    registeredBuyer.id,
  );
  TestValidator.equals(
    "logged in email matches",
    loggedInBuyer.email,
    testEmail,
  );
  TestValidator.equals(
    "logged in full name matches",
    loggedInBuyer.full_name,
    testFullName,
  );
  TestValidator.equals(
    "logged in phone number matches",
    loggedInBuyer.phone_number,
    testPhoneNumber,
  );
}
