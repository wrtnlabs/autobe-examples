import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test case-insensitive email login functionality.
 *
 * This test verifies that the login API supports case-insensitive email
 * matching due to lowercase normalization in the database. Users should be able
 * to log in regardless of the casing they use for their email address.
 *
 * Test Steps:
 *
 * 1. Register a new user with a lowercase email address
 * 2. Login with the original lowercase email - should succeed
 * 3. Login with mixed case variation (User@Example.com) - should succeed
 * 4. Login with all uppercase variation (USER@EXAMPLE.COM) - should succeed
 * 5. Login with random casing variation - should succeed
 * 6. Verify all login attempts return valid authentication tokens
 */
export async function test_api_user_login_case_insensitive_email(
  connection: api.IConnection,
) {
  // Generate a lowercase email for registration
  const baseEmail =
    `testuser${RandomGenerator.alphaNumeric(8)}@example.com`.toLowerCase();
  const password = RandomGenerator.alphaNumeric(12);

  // Step 1: Register a new user with lowercase email
  const registrationBody = {
    email: baseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredUser);

  // Verify the registered user has the lowercase email
  TestValidator.equals(
    "registered email is lowercase",
    registeredUser.email,
    baseEmail,
  );

  // Step 2: Login with original lowercase email
  const loginBody1 = {
    email: baseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const loginResult1: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody1,
    });
  typia.assert(loginResult1);
  TestValidator.equals(
    "login with lowercase email succeeds",
    loginResult1.email,
    baseEmail,
  );

  // Step 3: Login with mixed case variation (e.g., User@Example.com)
  const mixedCaseEmail = baseEmail
    .split("@")
    .map((part, index) => {
      if (index === 0) {
        // Capitalize first letter of local part
        return part.charAt(0).toUpperCase() + part.slice(1);
      } else {
        // Capitalize first letter after @ and after dot
        return part
          .split(".")
          .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
          .join(".");
      }
    })
    .join("@");

  const loginBody2 = {
    email: mixedCaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const loginResult2: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody2,
    });
  typia.assert(loginResult2);
  TestValidator.equals(
    "login with mixed case email succeeds",
    loginResult2.email,
    baseEmail,
  );

  // Step 4: Login with all uppercase variation
  const uppercaseEmail = baseEmail.toUpperCase();

  const loginBody3 = {
    email: uppercaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const loginResult3: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody3,
    });
  typia.assert(loginResult3);
  TestValidator.equals(
    "login with uppercase email succeeds",
    loginResult3.email,
    baseEmail,
  );

  // Step 5: Login with random casing variation
  const randomCaseEmail = baseEmail
    .split("")
    .map((char) => {
      if (char.match(/[a-z]/i)) {
        return Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase();
      }
      return char;
    })
    .join("");

  const loginBody4 = {
    email: randomCaseEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const loginResult4: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginBody4,
    });
  typia.assert(loginResult4);
  TestValidator.equals(
    "login with random case email succeeds",
    loginResult4.email,
    baseEmail,
  );

  // Verify all login results return the same user ID
  TestValidator.equals(
    "all logins return same user ID",
    loginResult1.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "mixed case login returns same user ID",
    loginResult2.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "uppercase login returns same user ID",
    loginResult3.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "random case login returns same user ID",
    loginResult4.id,
    registeredUser.id,
  );
}
