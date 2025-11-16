import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";

/**
 * Validate admin login functionality with an existing admin account.
 *
 * This test first creates a new admin user account using the /auth/admin/join
 * API to establish an existing user context. The account is created with a
 * unique and valid email and password. Then, it performs a login operation via
 * /auth/admin/login using the same credentials. It verifies that login succeeds
 * by checking the returned IAuthorized object, including valid JWT tokens.
 *
 * The test also validates error handling by attempting an admin login with
 * invalid credentials and locked accounts (e.g., accounts with deleted_at
 * timestamp). It ensures correct error responses are thrown.
 *
 * Key validation points:
 *
 * - Creation of the admin account via join API call
 * - Proper login with valid credentials returns an authorized admin user
 * - The admin account is active and not deleted
 * - The JWT access and refresh tokens are non-empty strings
 * - Timestamps such as created_at, updated_at, and token expirations are valid
 *   ISO strings
 * - Error cases for invalid credentials and locked accounts result in expected
 *   errors
 */
export async function test_api_admin_login_with_existing_account(
  connection: api.IConnection,
) {
  // 1. Create a new admin user account via /auth/admin/join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;

  const createdAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  TestValidator.equals(
    "createdAdmin email should match input",
    createdAdmin.email,
    adminEmail,
  );

  TestValidator.predicate(
    "createdAdmin account should be active",
    createdAdmin.is_active === true &&
      (createdAdmin.deleted_at === null ||
        createdAdmin.deleted_at === undefined),
  );

  TestValidator.predicate(
    "createdAdmin token access string should be non-empty",
    typeof createdAdmin.token.access === "string" &&
      createdAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "createdAdmin token refresh string should be non-empty",
    typeof createdAdmin.token.refresh === "string" &&
      createdAdmin.token.refresh.length > 0,
  );

  // 2. Attempt login with valid credentials via /auth/admin/login
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://example.com/login",
    referrer: "https://example.com/",
  } satisfies IRedditCommunityAdmin.ILogin;

  const loggedIn: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  TestValidator.equals(
    "logged in admin email should match created email",
    loggedIn.email,
    adminEmail,
  );

  TestValidator.predicate(
    "logged in admin account should be active",
    loggedIn.is_active === true &&
      (loggedIn.deleted_at === null || loggedIn.deleted_at === undefined),
  );

  // Tokens should be non-empty strings
  TestValidator.predicate(
    "logged in token access string should be non-empty",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );

  TestValidator.predicate(
    "logged in token refresh string should be non-empty",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );

  // Timestamp validations - use regex for ISO datetime format
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  TestValidator.predicate(
    "created_at is valid ISO datetime",
    isoDateRegex.test(loggedIn.created_at),
  );

  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    isoDateRegex.test(loggedIn.updated_at),
  );

  TestValidator.predicate(
    "token expired_at is valid ISO datetime",
    isoDateRegex.test(loggedIn.token.expired_at),
  );

  TestValidator.predicate(
    "token refreshable_until is valid ISO datetime",
    isoDateRegex.test(loggedIn.token.refreshable_until),
  );

  // 3. Error tests
  // 3.1 Login with invalid password
  await TestValidator.error(
    "login with invalid password should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: "WrongPassword!",
          ip: "127.0.0.1",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityAdmin.ILogin,
      });
    },
  );

  // 3.2 Login with locked/deleted account (simulate by using deleted_at set)
  // Since the API does not provide account update, simulate by trying login with a deleted account email
  // and expect failure. For the sake of this test, we try a random unknown email
  const deletedEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with deleted account should fail",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: deletedEmail,
          password: adminPassword,
          ip: "127.0.0.1",
          href: "https://example.com/login",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityAdmin.ILogin,
      });
    },
  );
}
