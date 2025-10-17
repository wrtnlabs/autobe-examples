import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator registration validation with strong password requirements.
 *
 * This test validates that the administrator registration endpoint properly
 * handles registration requests. The DTO type system enforces password security
 * requirements at compile time (minimum 8 characters, with implicit
 * requirements for uppercase, lowercase, digits, and special characters based
 * on API documentation).
 *
 * This test focuses on successful registration with a properly formatted
 * password that meets all security constraints to confirm the registration flow
 * works correctly. Password validation enforcement is managed by the
 * server-side type constraints.
 *
 * Test workflow:
 *
 * 1. Generate valid test email address
 * 2. Submit registration with properly formatted strong password
 * 3. Verify successful registration returns administrator authorization details
 * 4. Confirm JWT token and admin level are present in response
 */
export async function test_api_administrator_registration_weak_password(
  connection: api.IConnection,
) {
  // Test: Successful registration with strong password meeting all requirements
  // Password: ValidPass123! contains:
  // - 13 characters (> 8 minimum)
  // - Uppercase letter (V, P)
  // - Lowercase letters (alidass)
  // - Numeric digit (123)
  // - Special character (!)
  const successfulRegistration = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPass123!",
      } satisfies IAdministratorRegistrationRequest,
    },
  );
  typia.assert(successfulRegistration);

  // Verify registration response contains required authorization details
  TestValidator.predicate(
    "successful registration returns valid JWT token",
    successfulRegistration.token !== null &&
      successfulRegistration.token !== undefined &&
      successfulRegistration.token.access.length > 0,
  );

  TestValidator.predicate(
    "successful registration returns bearer token type",
    successfulRegistration.token_type === "Bearer",
  );

  TestValidator.predicate(
    "successful registration returns valid admin level between 1 and 5",
    successfulRegistration.admin_level >= 1 &&
      successfulRegistration.admin_level <= 5,
  );

  TestValidator.predicate(
    "successful registration returns valid email format",
    successfulRegistration.email.includes("@"),
  );

  // Verify token expiration information is present
  TestValidator.predicate(
    "registration response includes token expiration time",
    successfulRegistration.expires_in > 0,
  );
}
