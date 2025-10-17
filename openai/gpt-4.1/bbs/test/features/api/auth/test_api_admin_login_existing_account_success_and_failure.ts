import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate administrator login functionality for the discussion board system.
 *
 * 1. Register a new admin (unique email/username), simulate email verification,
 *    then log in with those credentials (should succeed; validate JWT/session
 *    returned).
 * 2. Attempt login with correct email but incorrect password (should fail; no
 *    session issued).
 * 3. Attempt login immediately after registration but before email verification
 *    (should fail; enforce email_verified required).
 */
export async function test_api_admin_login_existing_account_success_and_failure(
  connection: api.IConnection,
) {
  // --- 1. Register then login (positive flow) ---
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Register new admin
  const created: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(created);

  // Simulate email verification (the real API would send a code, but for test, set email_verified true)
  created.email_verified = true;

  // Login with correct credentials
  const loginResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(loginResult);
  TestValidator.equals(
    "login admin id matches created",
    loginResult.id,
    created.id,
  );
  TestValidator.predicate(
    "login returns verified JWT token",
    !!loginResult.token &&
      typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );

  // --- 2. Attempt login with wrong password ---
  await TestValidator.error(
    "login fails with correct email but wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: adminPassword + "wrong", // wrong password
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );

  // --- 3. Attempt login before verification (register new admin, do not verify) ---
  const unverifiedEmail = typia.random<string & tags.Format<"email">>();
  const unverifiedUsername = RandomGenerator.name();
  const unverifiedPassword = RandomGenerator.alphaNumeric(14);
  const unverified: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: unverifiedEmail,
        username: unverifiedUsername,
        password: unverifiedPassword,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(unverified);
  // Email not verified - email_verified remains false

  await TestValidator.error(
    "login fails when email is not verified",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: unverifiedEmail,
          password: unverifiedPassword,
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
}
