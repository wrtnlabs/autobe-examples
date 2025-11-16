import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test successful buyer account registration with complete valid information.
 *
 * This test validates the complete buyer registration workflow including:
 *
 * 1. Account creation with all required fields (email, password, full_name)
 * 2. Optional fields (phone_number, session context)
 * 3. Automatic session creation
 * 4. JWT token issuance (access and refresh tokens)
 * 5. Proper initialization of buyer profile (email_verified = false, deleted_at =
 *    null)
 *
 * The test ensures that new buyers can immediately access the platform after
 * registration without requiring a separate login step, as both access and
 * refresh tokens are provided in the registration response.
 */
export async function test_api_buyer_registration_successful(
  connection: api.IConnection,
) {
  // Generate unique registration data
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = typia.random<string & tags.MinLength<8>>();
  const registrationFullName = typia.random<
    string & tags.MinLength<2> & tags.MaxLength<100>
  >();
  const registrationPhoneNumber = RandomGenerator.mobile("+82");
  const registrationHref = typia.random<string & tags.Format<"uri">>();
  const registrationReferrer = typia.random<string & tags.Format<"uri">>();

  // Prepare registration request body
  const registrationData = {
    email: registrationEmail,
    password: registrationPassword,
    full_name: registrationFullName,
    phone_number: registrationPhoneNumber,
    href: registrationHref,
    referrer: registrationReferrer,
  } satisfies IShoppingMallBuyer.ICreate;

  // Call buyer registration API
  const registeredBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: registrationData,
    });

  // Validate response structure and data integrity
  typia.assert(registeredBuyer);

  // Verify buyer profile data
  TestValidator.equals(
    "registered email matches input",
    registeredBuyer.email,
    registrationEmail,
  );
  TestValidator.equals(
    "registered full name matches input",
    registeredBuyer.full_name,
    registrationFullName,
  );
  TestValidator.equals(
    "registered phone number matches input",
    registeredBuyer.phone_number,
    registrationPhoneNumber,
  );

  // Verify email verification status for new account
  TestValidator.equals(
    "email verified is false for new account",
    registeredBuyer.email_verified,
    false,
  );

  // Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for new active account",
    registeredBuyer.deleted_at,
    null,
  );

  // Verify authentication token presence
  TestValidator.predicate(
    "access token exists",
    registeredBuyer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredBuyer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    registeredBuyer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    registeredBuyer.token.refreshable_until.length > 0,
  );
}
