import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test successful login for registered user and error for unknown/soft-deleted
 * users.
 *
 * 1. Register a new user.
 * 2. Log in with correct email and password; verify user object and JWT tokens
 *    returned.
 * 3. Attempt login with non-existent email; expect error.
 * 4. Soft delete (simulate by updating status) the user (if API existed), then try
 *    login (skipped, as no soft-delete API available).
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = { email, password } satisfies ICommunityPlatformUser.IJoin;
  const joined: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);
  TestValidator.equals("user email after join", joined.email, email);
  TestValidator.predicate(
    "received JWT token on join",
    typeof joined.token.access === "string",
  );
  TestValidator.predicate(
    "received refresh token on join",
    typeof joined.token.refresh === "string",
  );

  // 2. Log in with correct credentials
  const loginBody = {
    email,
    password,
    href: "https://example.com/login", // required URI
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformUser.ILogin;
  const loggedIn: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: loginBody });
  typia.assert(loggedIn);
  TestValidator.equals("user id matches after login", loggedIn.id, joined.id);
  TestValidator.equals("user email matches after login", loggedIn.email, email);
  TestValidator.predicate(
    "received JWT token on login",
    typeof loggedIn.token.access === "string",
  );
  TestValidator.predicate(
    "received refresh token on login",
    typeof loggedIn.token.refresh === "string",
  );

  // 3. Attempt login with non-existent email
  const nonExistentLogin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformUser.ILogin;
  await TestValidator.error("login fails for non-existent user", async () => {
    await api.functional.auth.user.login(connection, {
      body: nonExistentLogin,
    });
  });

  // 4. Attempt login for soft-deleted user (if API existed). No API for soft-delete, so unable to test.
}
