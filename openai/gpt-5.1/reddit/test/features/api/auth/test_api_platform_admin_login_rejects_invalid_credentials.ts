import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that platform admin login rejects invalid credentials safely.
 *
 * Business goal:
 *
 * - Ensure that POST /auth/platformAdmin/login fails when either the identifier
 *   (username/email) is wrong or the password is wrong, even when the other
 *   half of the credential pair is valid.
 * - Focus purely on whether login attempts with invalid credentials result in
 *   errors, without inspecting status codes or error payload structures.
 *
 * Revised test flow (headers omitted for compliance with global rules):
 *
 * 1. Register a new platform administrator via
 *    api.functional.auth.platformAdmin.join using a known username, email, and
 *    password so we have a reference account.
 * 2. Attempt to log in with a non-existent identifier (different email) but a
 *    valid-looking password and context fields; assert that login() throws.
 * 3. Attempt to log in again using the correct identifier (the real admin
 *    username) but an incorrect password; assert that login() throws.
 *
 * Notes and constraints:
 *
 * - Use ICommunityPlatformPlatformadmin.IJoin as the body type for join() and
 *   ICommunityPlatformPlatformadmin.ILogin as the body type for login().
 * - Do not attempt to validate or depend on any particular HTTP status code or
 *   error payload; just use TestValidator.error() to assert that the call
 *   results in an error.
 * - Do not inspect or manipulate connection headers in this test; only rely on
 *   function behavior (success vs. error) for validation.
 */
export async function test_api_platform_admin_login_rejects_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator with known credentials
  const password = RandomGenerator.alphaNumeric(16);
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password,
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const joined = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(joined);

  // 2. Attempt login with non-existent identifier and valid-looking password
  const nonExistentIdentifierLoginBody = {
    identifier: `${RandomGenerator.alphabets(10)}@nonexistent.test`,
    password,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/marketing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  await TestValidator.error(
    "login with non-existent identifier must fail",
    async () => {
      await api.functional.auth.platformAdmin.login(connection, {
        body: nonExistentIdentifierLoginBody,
      });
    },
  );

  // 3. Attempt login with correct identifier (username) but wrong password
  const wrongPasswordLoginBody = {
    identifier: adminJoinBody.username,
    password: `${password}_wrong`,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  await TestValidator.error(
    "login with correct identifier but wrong password must fail",
    async () => {
      await api.functional.auth.platformAdmin.login(connection, {
        body: wrongPasswordLoginBody,
      });
    },
  );
}
