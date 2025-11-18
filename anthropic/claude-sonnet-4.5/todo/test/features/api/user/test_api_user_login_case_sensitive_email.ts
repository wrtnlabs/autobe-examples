import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email case sensitivity during user authentication.
 *
 * This test validates that the authentication system treats email addresses as
 * case-insensitive during login, following RFC 5321 best practices. The test
 * registers a user with a lowercase email, then verifies that login succeeds
 * with various case permutations of the same email address.
 *
 * Test workflow:
 *
 * 1. Register a new user with lowercase email address
 * 2. Verify registration succeeded
 * 3. Login with exact lowercase email (baseline verification)
 * 4. Login with various case variations (User@Example.com, USER@EXAMPLE.COM, etc.)
 * 5. Verify all case variations successfully authenticate to the same user account
 */
export async function test_api_user_login_case_sensitive_email(
  connection: api.IConnection,
) {
  // Generate test data with lowercase email
  const baseEmail = `testuser${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@example.com`;
  const password = "SecureP@ssw0rd123";
  const sessionData = {
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  };

  // Step 1: Register user with lowercase email
  const registrationBody = {
    email: baseEmail.toLowerCase(),
    password: password,
    name: RandomGenerator.name(),
    href: sessionData.href,
    referrer: sessionData.referrer,
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registrationBody });
  typia.assert(registeredUser);

  // Verify registration succeeded with correct email
  TestValidator.equals(
    "registered email matches lowercase input",
    registeredUser.email.toLowerCase(),
    baseEmail.toLowerCase(),
  );

  // Step 2: Login with exact lowercase email (baseline test)
  const exactLoginBody = {
    email: baseEmail.toLowerCase(),
    password: password,
    href: sessionData.href,
    referrer: sessionData.referrer,
  } satisfies ITodoListUser.ILogin;

  const exactLoginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: exactLoginBody });
  typia.assert(exactLoginResult);

  TestValidator.equals(
    "exact email login returns correct user ID",
    exactLoginResult.id,
    registeredUser.id,
  );

  // Step 3: Test case-insensitive login with various email case permutations
  const emailVariations = [
    baseEmail.charAt(0).toUpperCase() + baseEmail.slice(1),
    baseEmail.toUpperCase(),
    baseEmail.split("@")[0].toUpperCase() + "@" + baseEmail.split("@")[1],
    baseEmail.split("@")[0] + "@" + baseEmail.split("@")[1].toUpperCase(),
  ] as const;

  // Test each variation - all should successfully authenticate
  for (const emailVariation of emailVariations) {
    const variationLoginBody = {
      email: emailVariation,
      password: password,
      href: sessionData.href,
      referrer: sessionData.referrer,
    } satisfies ITodoListUser.ILogin;

    const variationLoginResult: ITodoListUser.IAuthorized =
      await api.functional.auth.user.login(connection, {
        body: variationLoginBody,
      });
    typia.assert(variationLoginResult);

    // Verify case variation authenticates to the same user (case-insensitive)
    TestValidator.equals(
      `case variation '${emailVariation}' authenticates same user`,
      variationLoginResult.id,
      registeredUser.id,
    );

    TestValidator.equals(
      `case variation '${emailVariation}' returns same email`,
      variationLoginResult.email.toLowerCase(),
      baseEmail.toLowerCase(),
    );
  }
}
