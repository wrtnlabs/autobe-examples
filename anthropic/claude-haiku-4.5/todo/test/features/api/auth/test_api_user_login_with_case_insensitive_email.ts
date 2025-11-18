import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test case-insensitive email matching during user login.
 *
 * This test validates that the authentication system handles email addresses in
 * a case-insensitive manner. A user is registered with a lowercase email
 * address, and then multiple login attempts are made using different case
 * variations (uppercase, mixed case). Each login attempt should succeed and
 * return valid authentication tokens, demonstrating that email comparison is
 * properly case-insensitive.
 *
 * Test flow:
 *
 * 1. Create a test email address
 * 2. Register a new user with the lowercase email
 * 3. Verify registration succeeds and tokens are returned
 * 4. Attempt login with uppercase email variation
 * 5. Verify login succeeds and valid tokens are returned
 * 6. Attempt login with mixed case email variation
 * 7. Verify login succeeds and valid tokens are returned
 * 8. Attempt login with original lowercase email
 * 9. Verify login succeeds and valid tokens are returned
 * 10. Validate all tokens have proper structure and format
 */
export async function test_api_user_login_with_case_insensitive_email(
  connection: api.IConnection,
) {
  // Step 1: Create test email address in lowercase
  const baseEmail = "testuser@example.com";
  const password = "SecurePassword123!";

  // Step 2: Register user with lowercase email
  const registrationData = {
    email: baseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredUser);

  TestValidator.equals(
    "registered user email is lowercase",
    registeredUser.email,
    baseEmail,
  );
  TestValidator.predicate(
    "registration token has access token",
    registeredUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "registration token has refresh token",
    registeredUser.token.refresh.length > 0,
  );

  // Step 3: Test login with uppercase email
  const uppercaseEmail = baseEmail.toUpperCase();
  const loginUppercase = await api.functional.auth.user.login(connection, {
    body: {
      email: uppercaseEmail,
      password: password,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginUppercase);

  TestValidator.equals(
    "uppercase email login succeeds",
    loginUppercase.email,
    baseEmail,
  );
  TestValidator.predicate(
    "uppercase login has valid access token",
    loginUppercase.token.access.length > 0,
  );
  TestValidator.predicate(
    "uppercase login has valid refresh token",
    loginUppercase.token.refresh.length > 0,
  );

  // Step 4: Test login with mixed case email
  const mixedCaseEmail = "TestUser@Example.COM";
  const loginMixedCase = await api.functional.auth.user.login(connection, {
    body: {
      email: mixedCaseEmail,
      password: password,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginMixedCase);

  TestValidator.equals(
    "mixed case email login succeeds",
    loginMixedCase.email,
    baseEmail,
  );
  TestValidator.predicate(
    "mixed case login has valid access token",
    loginMixedCase.token.access.length > 0,
  );
  TestValidator.predicate(
    "mixed case login has valid refresh token",
    loginMixedCase.token.refresh.length > 0,
  );

  // Step 5: Test login with original lowercase email
  const loginLowercase = await api.functional.auth.user.login(connection, {
    body: {
      email: baseEmail,
      password: password,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginLowercase);

  TestValidator.equals(
    "lowercase email login succeeds",
    loginLowercase.email,
    baseEmail,
  );
  TestValidator.predicate(
    "lowercase login has valid access token",
    loginLowercase.token.access.length > 0,
  );
  TestValidator.predicate(
    "lowercase login has valid refresh token",
    loginLowercase.token.refresh.length > 0,
  );

  // Step 6: Validate token structure consistency across all logins
  TestValidator.predicate(
    "all login attempts return tokens with identical structure",
    loginUppercase.token.access.length === loginMixedCase.token.access.length &&
      loginMixedCase.token.access.length === loginLowercase.token.access.length,
  );

  TestValidator.predicate(
    "all refresh tokens have consistent structure",
    loginUppercase.token.refresh.length ===
      loginMixedCase.token.refresh.length &&
      loginMixedCase.token.refresh.length ===
        loginLowercase.token.refresh.length,
  );

  // Step 7: Verify token expiration timestamps are set
  TestValidator.predicate(
    "access token expiration is set",
    new Date(loginLowercase.token.expired_at).getTime() > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration is set correctly",
    new Date(loginLowercase.token.refreshable_until).getTime() > Date.now(),
  );
}
