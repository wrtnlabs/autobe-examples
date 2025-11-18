import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that admin login email matching is case-insensitive.
 *
 * This test validates that the system normalizes email addresses to lowercase
 * for consistent authentication. It creates an admin account with a mixed-case
 * email address, then attempts to authenticate using different case variations
 * (uppercase, lowercase, mixed) to confirm that all variations successfully
 * authenticate to the same admin account.
 *
 * The test verifies:
 *
 * 1. Admin registration with mixed-case email succeeds
 * 2. Login with all-uppercase email succeeds and returns the same admin ID
 * 3. Login with all-lowercase email succeeds and returns the same admin ID
 * 4. Login with original mixed-case email succeeds and returns the same admin ID
 * 5. Each login creates a valid session with proper JWT tokens
 */
export async function test_api_admin_login_email_case_insensitive(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with mixed-case email
  const mixedCaseEmail = "Admin@Example.com";
  const password = "SecurePassword123!";

  const registrationBody = {
    email: mixedCaseEmail,
    password: password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ICreate;

  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredAdmin);

  // Validate registration response structure
  TestValidator.predicate(
    "registered admin has valid UUID",
    typia.is<string & tags.Format<"uuid">>(registeredAdmin.id),
  );
  TestValidator.predicate(
    "registered admin has valid token",
    registeredAdmin.token !== null && registeredAdmin.token !== undefined,
  );

  // Step 2: Login with all-uppercase email
  const uppercaseEmail = mixedCaseEmail.toUpperCase(); // "ADMIN@EXAMPLE.COM"

  const uppercaseLoginBody = {
    email: uppercaseEmail,
    password: password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const uppercaseLoginResult: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: uppercaseLoginBody,
    });
  typia.assert(uppercaseLoginResult);

  // Validate uppercase login returns same admin account
  TestValidator.equals(
    "uppercase email login returns same admin ID",
    uppercaseLoginResult.id,
    registeredAdmin.id,
  );
  TestValidator.predicate(
    "uppercase login has valid token",
    uppercaseLoginResult.token !== null &&
      uppercaseLoginResult.token !== undefined,
  );

  // Step 3: Login with all-lowercase email
  const lowercaseEmail = mixedCaseEmail.toLowerCase(); // "admin@example.com"

  const lowercaseLoginBody = {
    email: lowercaseEmail,
    password: password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const lowercaseLoginResult: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: lowercaseLoginBody,
    });
  typia.assert(lowercaseLoginResult);

  // Validate lowercase login returns same admin account
  TestValidator.equals(
    "lowercase email login returns same admin ID",
    lowercaseLoginResult.id,
    registeredAdmin.id,
  );
  TestValidator.predicate(
    "lowercase login has valid token",
    lowercaseLoginResult.token !== null &&
      lowercaseLoginResult.token !== undefined,
  );

  // Step 4: Login with original mixed-case email
  const mixedLoginBody = {
    email: mixedCaseEmail,
    password: password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com" satisfies string & tags.Format<"uri">,
  } satisfies ITodoListAdmin.ILogin;

  const mixedLoginResult: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: mixedLoginBody,
    });
  typia.assert(mixedLoginResult);

  // Validate mixed-case login returns same admin account
  TestValidator.equals(
    "mixed-case email login returns same admin ID",
    mixedLoginResult.id,
    registeredAdmin.id,
  );
  TestValidator.predicate(
    "mixed-case login has valid token",
    mixedLoginResult.token !== null && mixedLoginResult.token !== undefined,
  );

  // Step 5: Verify all logins created separate sessions with valid tokens
  TestValidator.predicate(
    "uppercase login created unique session token",
    uppercaseLoginResult.token.access !== registeredAdmin.token.access,
  );
  TestValidator.predicate(
    "lowercase login created unique session token",
    lowercaseLoginResult.token.access !== registeredAdmin.token.access,
  );
  TestValidator.predicate(
    "mixed-case login created unique session token",
    mixedLoginResult.token.access !== registeredAdmin.token.access,
  );
}
