import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator login email case sensitivity handling.
 *
 * Creates an administrator account with a lowercase email address, then tests
 * login attempts with the same email address in different case variations
 * (uppercase, mixed case). Validates that the system properly handles email
 * case sensitivity during authentication, verifying RFC 5321 compliance where
 * the domain portion is case-insensitive while the local part may be treated
 * case-insensitively by most email systems and login implementations.
 *
 * Test steps:
 *
 * 1. Create an administrator account with lowercase email
 * 2. Test login with the same email in uppercase
 * 3. Test login with mixed case email
 * 4. Test login with original lowercase email
 * 5. Verify all legitimate case variations successfully authenticate
 */
export async function test_api_administrator_login_case_sensitive_email(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator with lowercase email
  const lowercaseEmail = typia.random<string & tags.Format<"email">>();

  // Convert to lowercase to ensure we have a lowercase base email
  const baseEmail = lowercaseEmail.toLowerCase();

  const adminCredentials = {
    email: baseEmail,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "created admin email matches request",
    createdAdmin.email.toLowerCase(),
    baseEmail.toLowerCase(),
  );

  // Step 2: Test login with uppercase email
  const uppercaseEmail = baseEmail.toUpperCase();
  const loginWithUppercase: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: uppercaseEmail,
        password: adminCredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loginWithUppercase);

  TestValidator.equals(
    "login with uppercase email returns authorized response",
    loginWithUppercase.id,
    createdAdmin.id,
  );

  // Step 3: Test login with mixed case email
  const mixedCaseEmail = ArrayUtil.repeat(baseEmail.length, (index) => {
    const char = baseEmail[index];
    return index % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
  }).join("");

  const loginWithMixedCase: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: mixedCaseEmail,
        password: adminCredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loginWithMixedCase);

  TestValidator.equals(
    "login with mixed case email returns authorized response",
    loginWithMixedCase.id,
    createdAdmin.id,
  );

  // Step 4: Test login with original lowercase email
  const loginWithLowercase: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: baseEmail,
        password: adminCredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(loginWithLowercase);

  TestValidator.equals(
    "login with lowercase email returns authorized response",
    loginWithLowercase.id,
    createdAdmin.id,
  );

  // Step 5: Verify all login responses have valid tokens
  TestValidator.predicate(
    "uppercase login response has valid access token",
    loginWithUppercase.token.access.length > 0,
  );

  TestValidator.predicate(
    "mixed case login response has valid access token",
    loginWithMixedCase.token.access.length > 0,
  );

  TestValidator.predicate(
    "lowercase login response has valid access token",
    loginWithLowercase.token.access.length > 0,
  );
}
