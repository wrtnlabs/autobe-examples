import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";

/**
 * Test member login failure with invalid password.
 *
 * Validates that incorrect password is rejected while maintaining security by
 * not revealing specific account details in error responses. Tests the
 * authentication system's ability to properly validate credentials and handle
 * authentication failures without exposing sensitive information about account
 * existence or status.
 *
 * 1. Create a valid member account using the join endpoint
 * 2. Attempt login with correct username but incorrect password
 * 3. Verify that the login fails and no successful response is returned
 * 4. Test multiple invalid password scenarios to ensure consistent security
 *    behavior
 * 5. Focus on business logic rejection of invalid credentials rather than type
 *    testing
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to test against
  const joinData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123",
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: joinData,
  });
  typia.assert(member);

  // Step 2: Test login with incorrect password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: {
          username: joinData.username,
          password: "WrongPassword456",
          href: "https://example.com/login",
          referrer: "https://example.com/join",
        } satisfies IPoliticsBbsMember.ILogin,
      });
    },
  );

  // Step 3: Test login with completely different password format
  await TestValidator.error(
    "login with different password format should fail",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: {
          username: joinData.username,
          password: "short",
          href: "https://example.com/login",
          referrer: "https://example.com/join",
        } satisfies IPoliticsBbsMember.ILogin,
      });
    },
  );

  // Step 4: Test login with empty password
  await TestValidator.error(
    "login with empty password should fail",
    async () => {
      await api.functional.auth.members.login(connection, {
        body: {
          username: joinData.username,
          password: "",
          href: "https://example.com/login",
          referrer: "https://example.com/join",
        } satisfies IPoliticsBbsMember.ILogin,
      });
    },
  );

  // Step 5: Verify successful login still works with correct password
  const successfulLogin = await api.functional.auth.members.login(connection, {
    body: {
      username: joinData.username,
      password: joinData.password,
      href: "https://example.com/login",
      referrer: "https://example.com/join",
    } satisfies IPoliticsBbsMember.ILogin,
  });
  typia.assert(successfulLogin);

  TestValidator.equals(
    "successful login should return same username",
    successfulLogin.username,
    joinData.username,
  );

  TestValidator.equals(
    "successful login should return same email",
    successfulLogin.email,
    joinData.email,
  );
}
